import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get the most recent logistics lead with its full notes (raw payload from ShopyEasy)
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, phone, product_name, city, address, notes, status, board_type')
      .eq('board_type', 'logistics')
      .order('created_at', { ascending: false })
      .limit(3);

    // Try to parse the RAW PAYLOAD from notes for each lead
    const parsed = (leads || []).map((lead: any) => {
      let rawPayload = null;
      let variantFields: Record<string, any> = {};
      if (lead.notes) {
        try {
          const match = lead.notes.match(/RAW PAYLOAD:\s*(\{[\s\S]*\})/);
          if (match) {
            rawPayload = JSON.parse(match[1]);
            // Show ALL keys from the payload
            variantFields = rawPayload;
          }
        } catch (e: any) {
          rawPayload = `PARSE ERROR: ${e.message}`;
        }
      }
      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        product_name: lead.product_name,
        status: lead.status,
        notes_preview: lead.notes?.substring(0, 200),
        all_shopyeasy_fields: variantFields,
      };
    });

    return res.status(200).json({ success: true, leads: parsed });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
