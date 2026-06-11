import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

    // 2. Get store info (meta tokens)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('meta_access_token, waba_number')
      .eq('id', lead.store_id)
      .single();

    if (storeError || !store || !store.meta_access_token || !store.waba_number) {
      return res.status(400).json({ error: 'Store configuration missing Meta tokens' });
    }

    // 3. Send message via Meta API
    const metaApiUrl = `https://graph.facebook.com/v25.0/${store.waba_number}/messages`;
    
    const metaResponse = await fetch(metaApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${store.meta_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: lead.phone,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      })
    });

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error('Meta API Error:', metaResult);
      return res.status(500).json({ error: 'Failed to send message via Meta', details: metaResult });
    }

    return res.status(200).json({ success: true, messageId: metaResult.messages?.[0]?.id });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
