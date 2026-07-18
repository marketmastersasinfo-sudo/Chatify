import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Vercel Pro limit

// No podemos importar módulos locales (como phoneFormatter) fácilmente en funciones Vercel root sin setup extra, 
// así que copiamos la lógica de formateo aquí por simplicidad.
function formatPhone(phone: string, defaultCountryCode: string = '57'): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Eliminar el 0 inicial si está presente (muy común en Venezuela, Ecuador, Perú, Colombia)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Si después de limpiar, el número no empieza con el indicativo del país, se lo agregamos
  if (!cleaned.startsWith(defaultCountryCode)) {
    return `${defaultCountryCode}${cleaned}`;
  }
  
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
    
    // Mapa de indicativos por país
    const countryCallingCodes: Record<string, string> = {
      'Colombia': '57',
      'Perú': '51',
      'Ecuador': '593',
      'Venezuela': '58',
      'Costa Rica': '506',
      'Guatemala': '502'
    };
    const defaultCallingCode = countryCallingCodes[country] || '57';
    
    const { data: store } = await supabase.from('stores').select('id').eq('name', storeName).eq('country', country).single();
    if (!store) {
      return res.status(404).json({ error: `Tienda no encontrada: ${storeName} en ${country}` });
    }

    // 2. Formatear el teléfono
    const formattedPhone = formatPhone(customerPhone, defaultCallingCode);

    // 3. Determinar el tablero y estado correcto
    let targetBoard = 'logistics';
    let targetStatus = 'nuevo';

    if (eventType === 'abandoned_cart') {
      targetBoard = 'remarketing_carts';
      targetStatus = 'abandoned';
    }

    // 4. Revisar si el lead ya existe para esta tienda
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('store_id', store.id)
      .eq('phone', formattedPhone)
      .order('created_at', { ascending: false })
      .limit(1);

    const existingLead = existingLeads?.[0];

    let leadId = existingLead?.id;

    // ══════════════════════════════════════════════════════
    // CARRITOS ABANDONADOS: Siempre crear un lead nuevo si es un producto diferente
    // o si el lead existente ya fue procesado (bot_sent, recovered, lost).
    // Esto asegura que cada carrito abandonado quede registrado individualmente.
    // ══════════════════════════════════════════════════════
    const shouldCreateNew = !existingLead || (
      eventType === 'abandoned_cart' && (
        existingLead.product_name !== realProductName ||
        !['abandoned'].includes(existingLead.status)
      )
    );

    if (shouldCreateNew) {
      // 5. Insertar Lead nuevo
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
        recovery_touch: eventType === 'abandoned_cart' ? 0 : undefined,
        notes: `Order ID: ${realOrderId}\nRAW PAYLOAD: ${JSON.stringify(req.body)}`
      }).select().single();

      if (insertError) throw insertError;
      leadId = newLead.id;
    } else {
      // Si el lead ya existe y NO es carrito nuevo, actualizar datos faltantes.
      const updates: any = {};
      
      if (targetBoard === 'logistics' && existingLead.board_type.includes('remarketing')) {
        updates.board_type = 'logistics';
        updates.status = 'nuevo';
      }
      
      // Actualizar nombre si el existente es genérico
      if (customerName && existingLead.name && (['Cliente', 'Cliente WhatsApp', 'Amigo'].includes(existingLead.name) || !existingLead.name.trim())) {
        updates.name = customerName;
      }
      
      // Actualizar datos faltantes
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

    // ══════════════════════════════════════════════════════
    // ENVÍO DE PLANTILLA: Solo para pedidos confirmados (logistics)
    // Los carritos abandonados NO envían plantilla aquí.
    // El cron job de cart-recovery.ts se encarga de la secuencia
    // automática (T1 a los 30min, T2 a las 4hrs, T3 a las 24hrs).
    // ══════════════════════════════════════════════════════
    if (eventType === 'abandoned_cart') {
      return res.status(200).json({ 
        success: true, 
        message: 'Carrito abandonado registrado. El cron de recuperación se encargará de los mensajes.',
        leadId: leadId 
      });
    }

    // Solo para order_confirmation / logistics:
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
          "1": customerName,
          "2": realProductName || 'tu pedido',
          "3": totalPrice ? `$${totalPrice}` : '',
          "4": realAddress || 'tu dirección',
          "5": `${realCity || ''} ${department ? ', ' + department : ''}`.trim() || 'tu ciudad',
          "6": formattedPhone || ''
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: 'Webhook processed but Template failed', details: result });
    }

    return res.status(200).json({ success: true, message: 'Webhook processed and message sent!', leadId: leadId });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: error.message });
  }
}
