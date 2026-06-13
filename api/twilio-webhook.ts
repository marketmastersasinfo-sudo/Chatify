import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    let bodyObj: any = req.body;
    
    // Vercel doesn't always automatically parse application/x-www-form-urlencoded into an object.
    if (Buffer.isBuffer(req.body)) {
      bodyObj = Object.fromEntries(new URLSearchParams(req.body.toString('utf8')).entries());
    } else if (typeof req.body === 'string') {
      bodyObj = Object.fromEntries(new URLSearchParams(req.body).entries());
    }

    const { From, To, Body, MessageSid, ProfileName } = bodyObj || {};

    if (!From || !To) {
      console.error('Twilio Webhook: Missing From or To', bodyObj);
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // From and To format: "whatsapp:+18106666654"
    const customerPhone = From.replace('whatsapp:', '').replace('+', '');
    
    // DEBUG LOGGING
    try {
      const { data: dbgLead } = await supabase.from('leads').select('id').limit(1).single();
      if (dbgLead) {
        await supabase.from('messages').insert({
          lead_id: dbgLead.id,
          direction: 'inbound',
          message_type: 'text',
          content: `[DEBUG LOG]: Webhook received from ${From} to ${To} with body: ${Body}`,
          status: 'received'
        });
      }
    } catch(e) {}
    // Sanitize To number to match how it might be in the database
    let storeTwilioPhone = To.replace('whatsapp:', '').trim();
    let storeTwilioPhoneNoPlus = storeTwilioPhone.replace('+', '');
    let storeTwilioPhoneWithPlus = storeTwilioPhone.startsWith('+') ? storeTwilioPhone : `+${storeTwilioPhone}`;

    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, twilio_phone_number, organization_id');
      
    if (storesError) {
      console.error('Error fetching stores:', storesError);
    }
      
    const store = stores?.find(s => {
      if (!s.twilio_phone_number) return false;
      const dbNum = s.twilio_phone_number.trim().replace('whatsapp:', '');
      return dbNum === storeTwilioPhone || dbNum === storeTwilioPhoneNoPlus || dbNum === storeTwilioPhoneWithPlus;
    });

    if (!store) {
      console.error(`No store found with Twilio number ${storeTwilioPhone}`);
      return res.status(200).json({ error: 'No store found', storeTwilioPhone, stores, storesError }); // Always return 200 to Twilio
    }

    // 2. Find or create the lead
    let leadId = null;
    let leadStatus = '';
    let leadBoard = '';
    let leadAddress = '';
    let leadCity = '';

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, status, board_type, address, city')
      .eq('phone', customerPhone)
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
      leadStatus = existingLead.status;
      leadBoard = existingLead.board_type;
      leadAddress = existingLead.address || '';
      leadCity = existingLead.city || '';
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
      const { error: insertError } = await supabase.from('messages').insert({
        lead_id: leadId,
        sender_type: 'client',
        content: Body
      });
      
      if (insertError) {
        console.error('Error inserting message:', insertError);
        return res.status(200).json({ error: 'Insert failed', details: insertError });
      }
      
      const leadUpdates: any = { updated_at: new Date().toISOString() };

      // 4. GOOGLE STREET VIEW AUTOMATION
      // Si el lead de logística responde por primera vez (su estado era 'nuevo')
      // le enviamos automáticamente la fachada si tenemos la API key.
      if (leadBoard === 'logistics' && leadStatus === 'nuevo') {
        leadUpdates.status = 'client_replied'; // Movemos de estado
        
        // Fetch organization API key manually to avoid join errors
        const { data: org } = await supabase
          .from('organizations')
          .select('google_maps_api_key')
          .eq('id', store.organization_id)
          .single();
          
        const apiKey = org?.google_maps_api_key;
        
        if (apiKey && leadAddress && leadCity) {
          const mapQuery = encodeURIComponent(`${leadAddress}, ${leadCity}`);
          const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${mapQuery}&key=${apiKey}`;
          
          try {
            const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            await twilioClient.messages.create({
              from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
              to: `whatsapp:+${customerPhone}`,
              body: '¡Excelente! Para asegurar que la transportadora no se pierda, ¿nos confirmas si esta es la fachada de la dirección de entrega?',
              mediaUrl: [streetViewUrl]
            });
            
            // Guardar el mensaje del bot en el CRM
            await supabase.from('messages').insert({
              lead_id: leadId,
              sender_type: 'ai',
              content: `[Automated Street View Image Sent]\\n¡Excelente! Para asegurar que la transportadora no se pierda, ¿nos confirmas si esta es la fachada de la dirección de entrega?\\n\\nImage URL: ${streetViewUrl}`
            });
          } catch (e: any) {
            console.error('Error sending Street View image via Twilio:', e);
            await supabase.from('messages').insert({
              lead_id: leadId,
              sender_type: 'ai',
              content: `[BOT CRASH] Twilio Error: ${e.message}`
            });
          }
        } else {
            await supabase.from('messages').insert({
              lead_id: leadId,
              sender_type: 'ai',
              content: `[BOT SKIPPED] Missing data. APIKey: ${!!apiKey}, Address: ${!!leadAddress}, City: ${!!leadCity}`
            });
        }
      }

      // DEBUG COMMAND
      if (Body.trim().toUpperCase() === 'RESET') {
        await supabase.from('leads').update({ status: 'nuevo' }).eq('id', leadId);
        await supabase.from('messages').insert({
          lead_id: leadId,
          sender_type: 'ai',
          content: `[SISTEMA] Estado reseteado a 'nuevo'. Ahora envía "Confirmo".`
        });
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // Update the lead's status and updated_at timestamp
      await supabase.from('leads').update(leadUpdates).eq('id', leadId);
    }

    // Twilio expects an empty TwiML response or a 200 OK
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error: any) {
    console.error('Twilio Webhook Error:', error);
    // Always return 200 to Twilio so they don't retry forever, unless it's a critical infrastructure error
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
}
