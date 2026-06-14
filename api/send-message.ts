import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { leadId, message } = req.body;

    if (!leadId || !message) {
      return res.status(400).json({ error: 'Missing leadId or message' });
    }

    // 1. Get lead info (phone number and store_id)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('phone, store_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // 2. Get store info (Twilio Phone Number)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('twilio_phone_number')
      .eq('id', lead.store_id)
      .single();

    if (storeError || !store || !store.twilio_phone_number) {
      return res.status(400).json({ error: 'Store configuration missing Twilio Phone Number' });
    }

    // 3. Send message via Twilio API
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Sanitize from number
    let fromNumber = store.twilio_phone_number.trim();
    fromNumber = fromNumber.replace(/ /g, '');
    if (fromNumber.startsWith('whatsapp:')) {
      fromNumber = fromNumber.replace('whatsapp:', '');
    }
    if (!fromNumber.startsWith('+')) {
      fromNumber = `+${fromNumber}`;
    }
    fromNumber = `whatsapp:${fromNumber}`;

    // Sanitize to number
    let toNumber = lead.phone.trim();
    toNumber = toNumber.replace(/ /g, '');
    if (toNumber.startsWith('whatsapp:')) {
      toNumber = toNumber.replace('whatsapp:', '');
    }
    if (!toNumber.startsWith('+')) {
      toNumber = `+${toNumber}`;
    }
    toNumber = `whatsapp:${toNumber}`;

    const messageResult = await twilioClient.messages.create({
      from: fromNumber,
      to: toNumber,
      body: message,
    });

    return res.status(200).json({ success: true, messageId: messageResult.sid });
    
  } catch (error: any) {
    console.error('Server error:', error);
    
    // Traducción de errores comunes para el usuario
    let userFriendlyError = error.message || 'Error desconocido';
    if (userFriendlyError.includes('63016') || userFriendlyError.includes('Outside messaging window')) {
      userFriendlyError = 'WhatsApp bloqueó este mensaje. Han pasado más de 24 horas desde que el cliente te escribió. Para hablarle, envíale una "Plantilla" primero.';
    }

    // Guardar el error en la base de datos para que el usuario lo vea
    if (req.body?.leadId) {
      await supabase.from('messages').insert({
        lead_id: req.body.leadId,
        sender_type: 'ai',
        content: `[ERROR DE ENVÍO] ${userFriendlyError}`
      });
    }

    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
