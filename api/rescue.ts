import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// Use same maxDuration as webhook just in case
export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const oneHourAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, store_id, status, board_type, address, city, product_name, total_price, notes, document_id, email, recovery_touch, last_name, department, sector, postal_code')
    .gte('created_at', oneHourAgo);

  if (!leads) return res.status(200).json({ status: 'no leads' });

  const rescued = [];

  for (const lead of leads) {
    const { data: msgs } = await supabase.from('messages').select('content').eq('lead_id', lead.id);
    const hasRealMessage = msgs && msgs.some(m => m.content && m.content.trim() !== '');

    if (!hasRealMessage) {
      let fallbackMsg: string;

      if (lead.board_type === 'social_media') {
        fallbackMsg = (lead as any).comment_content || 'Consulta sobre anuncio en redes sociales';
        await supabase.from('messages').insert({
          lead_id: lead.id,
          sender_type: 'customer',
          content: fallbackMsg
        });
      } else {
        fallbackMsg = "[El cliente contactó desde un anuncio solicitando información]";
        await supabase.from('messages').delete().eq('lead_id', lead.id).eq('content', '   ');
        await supabase.from('messages').insert({
          lead_id: lead.id,
          sender_type: 'client',
          content: fallbackMsg
        });
      }

      // Llamar a la API localmente mediante un request http local (dentro de vercel)
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const params = new URLSearchParams();
      params.append('From', `whatsapp:+${lead.phone}`);
      params.append('To', 'whatsapp:+18106666654'); // Default store phone
      params.append('ProfileName', lead.name);
      params.append('Body', fallbackMsg);

      await fetch(`${baseUrl}/api/twilio-webhook`, {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).catch(e => console.error("Error triggering webhook", e));
      
      rescued.push(lead.name);
    }
  }

  return res.status(200).json({ rescued });
}
