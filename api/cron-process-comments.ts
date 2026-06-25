import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // 60 seconds is max for free/pro Vercel limits without special edge configs

// Inicializar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Asegurarnos de que esto solo se corra por el cron job o un admin
  // Vercel Cron inyecta un header secreto para verificar que fue lanzado por el cron
  const authHeader = req.headers.authorization;
  if (req.query.cron_key !== process.env.CRON_SECRET_KEY && authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    console.warn('Unauthorized cron attempt');
    // Para no bloquearnos mientras probamos, si CRON_SECRET_KEY no está seteado, pasamos.
    if (process.env.CRON_SECRET_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // 1. Buscar comentarios pendientes donde process_after ya pasó
    const { data: pendingComments, error: fetchError } = await supabase
      .from('pending_comments')
      .select('*, connected_pages(access_token)')
      .eq('status', 'PENDING')
      .lte('process_after', new Date().toISOString())
      .limit(10); // Procesar en lotes de 10 para no exceder los 60s

    if (fetchError) throw fetchError;
    
    if (!pendingComments || pendingComments.length === 0) {
      return res.status(200).json({ message: 'No hay comentarios pendientes en cola.' });
    }

    console.log(`Procesando ${pendingComments.length} comentarios de la cola...`);

    const results = [];

    // 2. Iterar y procesar cada comentario
    for (const comment of pendingComments) {
      try {
        const pageToken = comment.connected_pages?.access_token;
        if (!pageToken) {
          throw new Error('No access_token found for page');
        }

        // --- LÓGICA DE IA (CHATIFY NLP) ---
        // Por ahora simularemos la respuesta de NLP para completar el flujo.
        // Aquí puedes hacer un fetch a tu endpoint de AI interno
        const generatedReply = `¡Hola ${comment.sender_name}! Gracias por tu comentario. Te hemos enviado más información por mensaje directo (Simulado por IA Chatify).`;

        // 3. Responder en Facebook Graph API
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/${comment.comment_id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: generatedReply,
            access_token: pageToken
          })
        });

        const fbData = await fbRes.json();

        if (!fbRes.ok) {
          throw new Error(fbData.error?.message || 'Error en FB API');
        }

        // 4. Marcar como PROCESADO en base de datos
        await supabase
          .from('pending_comments')
          .update({ 
            status: 'PROCESSED', 
            processed_at: new Date().toISOString() 
          })
          .eq('id', comment.id);

        results.push({ id: comment.id, status: 'success', fb_reply_id: fbData.id });

      } catch (err: any) {
        console.error(`Error procesando comentario ${comment.id}:`, err);
        // Marcar como fallido
        await supabase
          .from('pending_comments')
          .update({ status: 'FAILED' })
          .eq('id', comment.id);
          
        results.push({ id: comment.id, status: 'error', reason: err.message });
      }
    }

    return res.status(200).json({ 
      message: 'Lote procesado', 
      results 
    });

  } catch (err: any) {
    console.error('Error maestro en cron:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
