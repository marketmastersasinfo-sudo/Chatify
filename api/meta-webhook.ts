import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase en el backend (Serverless)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const VERIFY_TOKEN = 'chatify_meta_secret_2026';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. VERIFICACIÓN DE META (GET)
  // Cuando configuras el Webhook en Facebook, ellos mandan un GET para confirmar.
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).json({ error: 'Token de verificación inválido' });
      }
    }
    return res.status(400).json({ error: 'Faltan parámetros de verificación' });
  }

  // 2. RECEPCIÓN DE MENSAJES (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Verificar que es un evento de WhatsApp
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // Si es un mensaje entrante
        if (value?.messages && value?.messages[0]) {
          const message = value.messages[0];
          const contact = value.contacts?.[0];
          
          const phone = message.from; // Número de quien escribe
          const name = contact?.profile?.name || 'Cliente WhatsApp';
          const text = message.text?.body || '';

          // A. Buscar si el Lead ya existe en Supabase
          let { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('phone', phone)
            .single();

          // B. Si no existe, lo creamos y lo asignamos a la primera tienda por defecto
          if (!lead) {
            // Buscamos una tienda para atar al lead
            const { data: stores } = await supabase.from('stores').select('id').limit(1);
            const storeId = stores?.[0]?.id;

            if (storeId) {
              const { data: newLead } = await supabase.from('leads').insert({
                store_id: storeId,
                name: name,
                phone: phone,
                traffic_source: 'WhatsApp Orgánico',
                board_type: 'sales_wa',
                status: 'new'
              }).select().single();
              
              lead = newLead;
            }
          }

          // C. Si el Lead existe (o se acaba de crear), guardamos el mensaje
          if (lead) {
            await supabase.from('messages').insert({
              lead_id: lead.id,
              sender_type: 'client',
              content: text
            });
            console.log(`Mensaje guardado para el lead: ${phone}`);
          }
        }
        
        return res.status(200).send('EVENT_RECEIVED');
      } else {
        return res.status(404).send('Not Found');
      }
    } catch (error) {
      console.error('Error procesando webhook:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
