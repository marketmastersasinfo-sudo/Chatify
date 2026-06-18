import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: store } = await supabase.from('stores').select('*').eq('name', 'ComprasYa').single();
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const { data: templates } = await supabase.from('store_templates').select('*').eq('store_id', store.id);
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const results = [];

    for (const t of templates || []) {
      if (!t.twilio_content_sid) continue;
      try {
        const content = await client.content.v1.contents(t.twilio_content_sid).fetch();
        results.push({
          name: t.template_name,
          sid: t.twilio_content_sid,
          types: content.types,
          variables: content.variables
        });
      } catch (e: any) {
        results.push({ name: t.template_name, error: e.message });
      }
    }

    return res.status(200).json({ templates: results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
