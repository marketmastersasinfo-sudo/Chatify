import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

  // { eventType: 'order_confirmation' | 'abandoned_cart', storeName: 'Yacompro', customerName: 'Juan', customerPhone: '318...', orderId: '123', productName: 'Zapatos', city: 'Bogota', address: 'Calle 1' }
  const { eventType, storeName, customerName, customerPhone, orderId, productName, city, address } = req.body;

  if (!eventType || !storeName || !customerName || !customerPhone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Buscar el ID de la tienda por su nombre
    const { data: store } = await supabase.from('stores').select('id').eq('name', storeName).single();
    if (!store) {
      return res.status(404).json({ error: `Tienda no encontrada: ${storeName}` });
    }

    // 2. Formatear el teléfono
    const formattedPhone = formatPhone(customerPhone);

    // 3. Crear o actualizar el Lead
    const { data: lead, error: leadError } = await supabase.from('leads').upsert({
      store_id: store.id,
      name: customerName,
      phone: formattedPhone,
      traffic_source: 'Shopyeasy Webhook',
      board_type: 'sales_wa',
      status: eventType === 'abandoned_cart' ? 'contacted' : 'won',
      notes: `Order ID: ${orderId || 'N/A'}`
    }, { onConflict: 'phone' }).select().single();

    if (leadError) throw leadError;

    // 4. Llamar a nuestro propio endpoint interno para disparar la plantilla
    // En producción (Vercel), podemos usar el fetch directo a nuestra misma URL
    const host = req.headers.host || 'chatify-teal-xi.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const response = await fetch(`${protocol}://${host}/api/send-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        templateType: eventType,
        variables: {
          customerName: customerName,
          productName: productName || 'tu pedido',
          city: city || '',
          address: address || ''
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: 'Webhook processed but Template failed', details: result });
    }

    return res.status(200).json({ success: true, message: 'Webhook processed and message sent!', leadId: lead.id });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: error.message });
  }
}
