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
      templateId, 
      tags, // array of statuses or board types
      dateFrom,
      dateTo,
      geography, // e.g., 'all', 'principal'
      ltv, // e.g., 'all', '50', '100'
      paymentStatus // e.g., 'delivered'
    } = req.body;

    if (!storeId || !templateId) {
      return res.status(400).json({ error: 'storeId and templateId are required' });
    }

    // Build Query
    let query = supabase
      .from('leads')
      .select('id')
      .eq('store_id', storeId);

    // Apply Tags / Status
    if (tags && tags !== 'all') {
      if (tags === 'vip') {
        // VIP = >1 purchase or LTV > high. Example fallback:
        query = query.not('status', 'eq', 'lost');
      } else {
        query = query.eq('status', tags);
      }
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

    const { data: leads, error } = await query;
    if (error) throw error;

    if (!leads || leads.length === 0) {
      return res.status(400).json({ error: 'No leads found matching these filters.' });
    }

    // Filter locally for LTV if needed since we don't have direct LTV column (we have total_price)
    let finalLeads = leads;
    if (ltv && ltv !== 'all') {
      const minAmount = parseInt(ltv);
      const { data: fullLeads } = await supabase.from('leads').select('id, total_price').in('id', leads.map(l => l.id));
      if (fullLeads) {
        finalLeads = fullLeads.filter(l => (l.total_price || 0) >= minAmount);
      }
    }

    if (finalLeads.length === 0) {
      return res.status(400).json({ error: 'No leads found after applying LTV filters.' });
    }

    // Insert into broadcast_queue
    const queueInserts = finalLeads.map(lead => ({
      store_id: storeId,
      lead_id: lead.id,
      template_id: templateId,
      status: 'pending'
    }));

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
