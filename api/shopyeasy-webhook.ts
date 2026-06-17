import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { firePixelEvent } from './utils/_tracking.js';

// No podemos importar módulos locales (como phoneFormatter) fácilmente en funciones Vercel root sin setup extra, 
// así que copiamos la lógica de formateo aquí por simplicidad.
function formatPhone(phone: string, defaultCountryCode: string = '57'): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned.substring(1);
  if (cleaned.length === 10) return `${defaultCountryCode}${cleaned}`;
  if (cleaned.length > 10 && cleaned.startsWith(defaultCountryCode)) return cleaned;
  return cleaned;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Aceptamos variaciones comunes de nombres de variables para mayor compatibilidad con Dropi, Shopyeasy, Make.com
  const eventType = req.body.eventType || req.body.event || 'order_confirmation';
  const storeName = req.body.storeName || req.body.store || 'Vistet';
  const storeCountry = req.body.storeCountry || req.body.country || 'CO';
  const customerName = req.body.customerName || req.body.name || req.body.customer_name;
  const customerPhone = req.body.customerPhone || req.body.phone || req.body.customer_phone;
  const orderId = req.body.orderId || req.body.order_id || req.body.id;
  const productName = req.body.productName || req.body.product || req.body.product_name || req.body.item;
  const city = req.body.city || req.body.ciudad;
  const address = req.body.address || req.body.direccion;
  const department = req.body.department || req.body.departamento;
  const totalPrice = req.body.totalPrice || req.body.total || req.body.price || req.body.total_price;

  if (!eventType || !storeName || !customerName || !customerPhone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Auto-parse payload if the user stuffed everything into orderId
  let realOrderId = orderId || 'N/A';
  let realCity = city;
  let realAddress = address;
  let realProductName = productName;

  if (typeof orderId === 'string' && (orderId.includes('City:') || orderId.includes('Product:'))) {
    const lines = orderId.split('\n').map(l => l.trim());
    realOrderId = lines[0] || 'N/A';
    
    const cityLine = lines.find(l => l.startsWith('City:'));
    if (cityLine && !realCity) realCity = cityLine.replace('City:', '').trim();
    
    const addressLine = lines.find(l => l.startsWith('Address:'));
    if (addressLine && !realAddress) realAddress = addressLine.replace('Address:', '').trim();
    
    const productLine = lines.find(l => l.startsWith('Product:'));
    if (productLine && !realProductName) realProductName = productLine.replace('Product:', '').trim();
  }

  try {
    // 1. Buscar el ID de la tienda por su nombre Y país
    const rawCountry = storeCountry || 'CO';
    const countryMap: Record<string, string> = {
      'CO': 'Colombia',
      'MX': 'México',
      'AR': 'Argentina',
      'CL': 'Chile',
      'PE': 'Perú',
      'EC': 'Ecuador',
      'VE': 'Venezuela',
      'CR': 'Costa Rica',
      'GT': 'Guatemala'
    };
    const country = countryMap[rawCountry] || rawCountry;
    
    const { data: store } = await supabase.from('stores').select('id').eq('name', storeName).eq('country', country).single();
    if (!store) {
      return res.status(404).json({ error: `Tienda no encontrada: ${storeName} en ${country}` });
    }

    // 2. Formatear el teléfono
    const formattedPhone = formatPhone(customerPhone);

    // 3. Determinar el tablero y estado correcto
    let targetBoard = 'logistics';
    let targetStatus = 'nuevo';

    if (eventType === 'abandoned_cart') {
      targetBoard = 'remarketing_carts';
      targetStatus = 'abandoned';
    }

    // 4. Revisar si el lead ya existe para esta tienda (Prevención global del error 42P10)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('store_id', store.id)
      .eq('phone', formattedPhone)
      .maybeSingle();

    let leadId = existingLead?.id;

    if (!existingLead) {
      // 5. Insertar Lead (sin upsert, inserción directa y segura)
      const { data: newLead, error: insertError } = await supabase.from('leads').insert({
        store_id: store.id,
        name: customerName,
        phone: formattedPhone,
        traffic_source: 'Shopyeasy Webhook',
        board_type: targetBoard,
        status: targetStatus,
        city: realCity || null,
        address: realAddress || null,
        department: department || null,
        total_price: totalPrice || null,
        product_name: realProductName || null,
        notes: `Order ID: ${realOrderId}\nRAW PAYLOAD: ${JSON.stringify(req.body)}`
      }).select().single();

      if (insertError) throw insertError;
      leadId = newLead.id;

      // 6. TRACKING: Disparar evento de Lead/SubmitForm
      await firePixelEvent(supabase, leadId, 'Lead', Number(totalPrice) || 0, 'COP', formattedPhone).catch(console.error);
    } else {
      // Si el lead ya existe en Carritos, pero este nuevo webhook es una VENTA (logistics), 
      // debemos MOVER el lead al tablero de Logística porque el cliente finalmente compró.
      const updates: any = {};
      
      if (targetBoard === 'logistics' && existingLead.board_type.includes('remarketing')) {
        updates.board_type = 'logistics';
        updates.status = 'nuevo';
      }
      
      // Actualizar datos de la venta si llegaron ahora (en carritos a veces no llegan)
      if (realCity && !existingLead.city) updates.city = realCity;
      if (realAddress && !existingLead.address) updates.address = realAddress;
      if (department && !existingLead.department) updates.department = department;
      if (totalPrice && !existingLead.total_price) updates.total_price = totalPrice;
      if (realProductName && !existingLead.product_name) updates.product_name = realProductName;
      
      updates.notes = (existingLead.notes ? existingLead.notes + '\n\n' : '') + `UPDATE RAW PAYLOAD: ${JSON.stringify(req.body)}`;
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('leads').update(updates).eq('id', existingLead.id);
      }
    }

    // 4. Llamar a nuestro propio endpoint interno para disparar la plantilla
    // En producción (Vercel), podemos usar el fetch directo a nuestra misma URL
    const host = req.headers.host || 'chatify-teal-xi.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const response = await fetch(`${protocol}://${host}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'template',
        leadId: leadId,
        templateType: eventType,
        variables: {
          customerName: customerName,
          productName: realProductName || 'tu pedido',
          city: realCity || '',
          address: realAddress || '',
          department: department || '',
          totalPrice: totalPrice ? `$${totalPrice}` : '',
          orderId: realOrderId || '',
          // Default mappings for the "confirmacion_pedido" template
          "1": customerName,
          "2": `${realAddress || ''} ${realCity ? ', ' + realCity : ''}`.trim(),
          "3": formattedPhone,
          "4": realProductName || 'tu pedido',
          "5": totalPrice ? `$${totalPrice}` : ''
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: 'Webhook processed but Template failed', details: result });
    }

    // 7. TRACKING: Disparar evento de Contact al enviar el primer mensaje exitosamente
    await firePixelEvent(supabase, leadId, 'Contact', Number(totalPrice) || 0, 'COP', formattedPhone).catch(console.error);

    return res.status(200).json({ success: true, message: 'Webhook processed and message sent!', leadId: leadId });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: error.message });
  }
}
