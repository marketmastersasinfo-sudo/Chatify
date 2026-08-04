import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! // need service role to bypass RLS in CRON
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir POST o GET con un token secreto (si se configura)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const log: string[] = [];
  let processed = 0;

  try {
    // 1. Fetch pending queue items (Max 50 per minute to prevent bans)
    const { data: queueItems, error: qError } = await supabase
      .from('broadcast_queue')
      .select('id, store_id, lead_id, template_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (qError) throw qError;

    if (!queueItems || queueItems.length === 0) {
      return res.status(200).json({ status: 'idle', message: 'No pending broadcasts in queue.' });
    }

    // Extract unique store_ids to fetch Meta credentials
    const storeIds = [...new Set(queueItems.map(q => q.store_id))];
    
    // Fetch Meta App Credentials for stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, wa_access_token, wa_phone_number_id, organization_id')
      .in('id', storeIds);

    const storeMetaMap: Record<string, any> = {};
    if (stores) {
      for (const store of stores) {
        if (store.wa_access_token && store.wa_phone_number_id) {
          storeMetaMap[store.id] = {
            accessToken: store.wa_access_token,
            phoneNumberId: store.wa_phone_number_id
          };
        }
      }
    }

    // Fetch required leads and templates in bulk
    const leadIds = [...new Set(queueItems.map(q => q.lead_id))];
    const templateIds = [...new Set(queueItems.map(q => q.template_id))];

    const [{ data: leads }, { data: templates }] = await Promise.all([
      supabase.from('leads').select('id, phone, name, city, address').in('id', leadIds),
      supabase.from('store_templates').select('id, template_name, sent_count').in('id', templateIds)
    ]);

    const leadMap = new Map((leads || []).map(l => [l.id, l]));
    const templateMap = new Map((templates || []).map(t => [t.id, t]));

    // Helper to send template
    const { sendMetaTemplate } = await import('./utils/_meta-whatsapp.js');

    // 2. Process each item
    for (const item of queueItems) {
      const metaCreds = storeMetaMap[item.store_id];
      const lead = leadMap.get(item.lead_id);
      const template = templateMap.get(item.template_id);

      if (!metaCreds || !lead || !template) {
        log.push(`SKIP queue ${item.id} — missing creds, lead, or template`);
        await supabase.from('broadcast_queue').update({ status: 'failed', error_message: 'Missing dependencies', processed_at: new Date().toISOString() }).eq('id', item.id);
        continue;
      }

      // Format variables (1: Name, 2: Product Name or City)
      const contentVariables: Record<string, string> = {
        '1': lead.name?.split(' ')[0] || 'Cliente',
        '2': lead.product_name || lead.city || 'tu pedido',
      };
      const filtered = Object.fromEntries(
        Object.entries(contentVariables).filter(([, v]) => v.trim() !== '')
      );
      
      const components = [];
      if (Object.keys(filtered).length > 0) {
        components.push({
          type: 'body',
          parameters: Object.keys(filtered).map(k => ({ type: 'text', text: filtered[k] }))
        });
      }

      try {
        const result = await sendMetaTemplate({
          phoneNumberId: metaCreds.phoneNumberId,
          accessToken: metaCreds.accessToken,
          to: lead.phone
        }, template.template_name, 'es', components);

        const messageId = result?.messages?.[0]?.id || null;

        // Mark as sent and store message_id for open rate tracking
        await supabase.from('broadcast_queue').update({ 
          status: 'sent', 
          message_id: messageId,
          processed_at: new Date().toISOString() 
        }).eq('id', item.id);
        
        // Save to CRM messages
        await supabase.from('messages').insert({
          lead_id: lead.id,
          sender_type: 'human',
          content: `[Broadcast] Plantilla enviada: ${template.template_name}`,
          template_id: template.id
        });

        // Update template counter
        await supabase.from('store_templates').update({ sent_count: (template.sent_count || 0) + 1 }).eq('id', template.id);
        
        log.push(`✅ SENT queue ${item.id} to ${lead.phone}`);
        processed++;
      } catch (err: any) {
        log.push(`🚫 ERROR queue ${item.id}: ${err.message}`);
        await supabase.from('broadcast_queue').update({ status: 'failed', error_message: err.message, processed_at: new Date().toISOString() }).eq('id', item.id);
      }
    }

    return res.status(200).json({ status: 'success', processed, log });

  } catch (err: any) {
    console.error('CRON Broadcast Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
