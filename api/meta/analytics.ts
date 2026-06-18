import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { storeId, startDate, endDate } = req.query;

  if (!storeId) return res.status(400).json({ error: 'Falta storeId' });

  try {
    // 1. Fetch templates for this store
    const { data: templates } = await supabase
      .from('store_templates')
      .select('id, template_name, template_type, is_active')
      .eq('store_id', storeId as string);

    if (!templates || templates.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const templateIds = templates.map(t => t.id);

    // 2. Fetch messages for these templates within the timeframe
    let query = supabase
      .from('messages')
      .select('template_id, is_conversion, created_at, converted_at')
      .in('template_id', templateIds);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    // 3. Aggregate data per template
    const analyticsMap: Record<string, { sent: number, converted: number }> = {};
    templates.forEach(t => analyticsMap[t.id] = { sent: 0, converted: 0 });

    messages?.forEach(msg => {
      if (msg.template_id && analyticsMap[msg.template_id]) {
        analyticsMap[msg.template_id].sent += 1;
        if (msg.is_conversion) {
          analyticsMap[msg.template_id].converted += 1;
        }
      }
    });

    // 4. Merge templates with their calculated stats
    const results = templates.map(t => ({
      ...t,
      sent_count: analyticsMap[t.id].sent,
      conversion_count: analyticsMap[t.id].converted,
      conversion_rate: analyticsMap[t.id].sent > 0 
        ? Math.round((analyticsMap[t.id].converted / analyticsMap[t.id].sent) * 100) 
        : 0
    }));

    return res.status(200).json({ success: true, data: results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
