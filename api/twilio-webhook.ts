import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Twilio sends data as URL-encoded form data (application/x-www-form-urlencoded)
    const { From, To, Body, MessageSid, ProfileName } = req.body;

    if (!From || !To || !Body) {
      return res.status(400).send('Bad Request');
    }

    // From and To format: "whatsapp:+18106666654"
    const customerPhone = From.replace('whatsapp:', '').replace('+', '');
    const storeTwilioPhone = To.replace('whatsapp:', '');

    // 1. Find the store that owns this Twilio number
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('twilio_phone_number', storeTwilioPhone)
      .single();

    if (!store) {
      console.error(`No store found with Twilio number ${storeTwilioPhone}`);
      return res.status(200).send('OK'); // Always return 200 to Twilio
    }

    // 2. Find or create the lead
    let leadId = null;
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', customerPhone)
      .eq('store_id', store.id)
      .single();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      // Create new lead
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          store_id: store.id,
          name: ProfileName || 'Cliente WhatsApp',
          phone: customerPhone,
          status: 'cold_lead',
          board_type: 'sales_wa',
          traffic_source: 'whatsapp_direct',
          is_banned: false
        })
        .select()
        .single();
        
      if (newLead) leadId = newLead.id;
    }

    // 3. Save the message to the CRM
    if (leadId) {
      await supabase.from('messages').insert({
        lead_id: leadId,
        store_id: store.id,
        direction: 'inbound',
        message_type: 'text',
        content: Body,
        status: 'received',
        metadata: {
          twilio_message_sid: MessageSid,
          sender_name: ProfileName
        }
      });
      
      // Update the lead's updated_at timestamp to bring them to the top
      await supabase.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId);
    }

    // Twilio expects an empty TwiML response or a 200 OK
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<Response></Response>');

  } catch (error: any) {
    console.error('Twilio Webhook Error:', error);
    // Always return 200 to Twilio so they don't retry forever, unless it's a critical infrastructure error
    return res.status(200).send('<Response></Response>');
  }
}
