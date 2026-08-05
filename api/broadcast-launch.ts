import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { 
      storeId, 
      templateIds, 
      tags, // array of statuses or board types
      dateFrom,
      dateTo,
      geography, // e.g., 'all', 'principal'
      ltv, // e.g., 'all', '50', '100'
      paymentStatus, // e.g., 'delivered'
      productName
    } = req.body;

    if (!storeId || !templateIds || templateIds.length === 0) {
      return res.status(400).json({ error: 'storeId and templateIds are required' });
    }

    // Build Query
    let query = supabase
      .from('leads')
      .select('id')
      .eq('store_id', storeId)
      .limit(100000);

    // Apply Tags / Status
    if (tags && tags !== 'all') {
      if (tags === 'vip') query = query.in('status', ['confirmado', 'closed', 'paid', 'delivered']);
      else if (tags === 'abandoned') query = query.in('status', ['abandoned', 'bot_sent']);
      else if (tags === 'remarketing') query = query.in('status', ['new', 'inquiry', 'negotiating', 'cold_lead', 'high_intent']);
      else query = query.eq('status', tags);
    }

    // Apply Product Filter
    if (productName && productName !== 'all') {
      query = query.ilike('product_name', `%${productName}%`);
    }

    // Apply Dates
    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    // Geography
    if (geography && geography !== 'all') {
      if (geography === 'principal') {
        query = query.in('city', ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena']);
      }
    }

    // Payment Status
    if (paymentStatus === 'delivered') {
      query = query.eq('status', 'delivered');
    } else if (paymentStatus === 'paid') {
      query = query.in('status', ['paid', 'delivered']);
    }

    // Apply LTV
    if (ltv && ltv !== 'all') {
      query = query.gte('total_price', parseInt(ltv));
    }

    let allLeads: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await query.range(from, from + step - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allLeads.push(...data);
      if (data.length < step) break;
      from += step;
    }

    if (allLeads.length === 0) {
      return res.status(400).json({ error: 'No leads found matching these filters.' });
    }

    const finalLeads = allLeads;

    // Insert into broadcast_queue (Equally distributed A/B/C/D testing)
    // We shuffle the finalLeads array to ensure true random distribution before splitting
    const shuffledLeads = finalLeads.sort(() => Math.random() - 0.5);

    const queueInserts = shuffledLeads.map((lead, index) => {
      // Pick template mathematically
      const assignedTemplateId = templateIds[index % templateIds.length];
      
      return {
        store_id: storeId,
        lead_id: lead.id,
        template_id: assignedTemplateId,
        status: 'pending'
      };
    });

    // Insert in batches of 1000 to avoid request too large
    for (let i = 0; i < queueInserts.length; i += 1000) {
      const batch = queueInserts.slice(i, i + 1000);
      const { error: insertError } = await supabase.from('broadcast_queue').insert(batch);
      if (insertError) throw insertError;
    }

    return res.status(200).json({ 
      success: true, 
      queued_count: finalLeads.length,
      message: `Encolados ${finalLeads.length} leads exitosamente.`
    });

  } catch (err: any) {
    console.error('Broadcast Launch Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
