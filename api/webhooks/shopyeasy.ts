import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration for webhooks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { storeId } = req.query;

  if (!storeId) {
    return res.status(400).json({ error: 'Falta el storeId en la URL del webhook.' });
  }

  try {
    // Expected Payload from Shopyeasy:
    // {
    //   event_type: 'new_order' | 'abandoned_cart',
    //   customer: { name: 'Juan', phone: '573001234567' },
    //   order: { total: 50000, products: 'Tenis Nike' }
    // }
    
    const payload = req.body;
    
    if (!payload || !payload.customer || !payload.customer.phone) {
      return res.status(400).json({ error: 'Payload inválido. Se requiere customer.phone' });
    }

    // Determine board based on event type
    let board_type = 'sales_wa'; // Default to sales
    let status = 'Nuevo';

    if (payload.event_type === 'abandoned_cart') {
      status = 'Carrito Abandonado';
    }

    // Insert into Supabase `leads` table
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        store_id: storeId as string,
        name: payload.customer.name || 'Cliente sin nombre',
        phone: payload.customer.phone,
        traffic_source: 'Shopyeasy Webhook',
        board_type: board_type,
        status: status,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, message: 'Lead guardado correctamente', data: lead });

  } catch (error: any) {
    console.error('Shopyeasy Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
