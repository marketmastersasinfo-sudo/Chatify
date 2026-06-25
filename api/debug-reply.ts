import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Obtener el ultimo comentario fallido
    const { data: failedComments } = await supabase
      .from('pending_comments')
      .select('*')
      .eq('status', 'FAILED')
      .order('process_after', { ascending: false })
      .limit(1);

    if (!failedComments || failedComments.length === 0) {
      return res.status(200).json({ error: 'No failed comments found' });
    }

    const comment = failedComments[0];

    // 2. Obtener el token de la pagina
    const { data: pageData } = await supabase
      .from('connected_pages')
      .select('access_token')
      .eq('page_id', comment.page_id)
      .single();

    const pageToken = pageData?.access_token;
    if (!pageToken) return res.status(200).json({ error: 'No token found' });
    
    return res.status(200).json({ token: pageToken.substring(0, 30) });

    // 3. Intentar responder
    const fbRes = await fetch(`https://graph.facebook.com/v19.0/${comment.comment_id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Debug reply",
        access_token: pageToken
      })
    });

    const fbData = await fbRes.json();
    return res.status(200).json({ fbData, ok: fbRes.ok });

  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
