import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Vercel Pro limit

// Inicializar Supabase en el backend (Serverless)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. VERIFICACIÓN DE META (GET) MULTI-TENANT
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token) {
      // Buscar si alguna tienda tiene este token
      const { data: store } = await supabase.from('stores').select('id').eq('meta_verify_token', token).single();
      
      if (store || token === 'chatify_meta_secret_2026') { // Fallback al token genérico por ahora
        console.log('WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).json({ error: 'Token de verificación inválido o no encontrado en ninguna tienda' });
      }
    }
    return res.status(400).json({ error: 'Faltan parámetros de verificación' });
  }

  // 2. RECEPCIÓN DE MENSAJES (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // DEBUG EXTREMO: Guardar el payload crudo que manda Facebook
      await supabase.from('pending_comments').insert({
        page_id: 'DEBUG',
        post_id: 'DEBUG',
        comment_id: 'DEBUG_' + Date.now(),
        sender_id: 'DEBUG',
        sender_name: 'DEBUG',
        message: JSON.stringify(body).substring(0, 1000),
        status: 'FAILED',
        process_after: new Date().toISOString()
      });

      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const waba_number = value?.metadata?.phone_number_id;

        if (value?.messages && value?.messages[0] && waba_number) {
          const message = value.messages[0];
          const contact = value.contacts?.[0];
          
          const phone = message.from; 
          const name = contact?.profile?.name || 'Cliente WhatsApp';
          const text = message.text?.body || '';

          // A. Buscar a qué tienda le escribieron basándonos en el número receptor
          let { data: store } = await supabase.from('stores').select('id').eq('waba_number', waba_number).single();
          
          // Fallback temporal si no encuentra la tienda exacta
          if (!store) {
             const { data: firstStore } = await supabase.from('stores').select('id').limit(1);
             store = firstStore?.[0];
          }

          if (store) {
            // B. Buscar si el Lead ya existe en ESA tienda
            let { data: lead } = await supabase
              .from('leads')
              .select('*')
              .eq('phone', phone)
              .eq('store_id', store.id)
              .single();

            // C. Si no existe, lo creamos
            if (!lead) {
              // Walink Smart Parser (Anti-Friction)
              let detectedProduct = null;
              let detectedSource = 'WhatsApp Orgánico';
              
              const lowerText = text.toLowerCase();
              
              // 1. Detectar Fuente de Tráfico
              if (lowerText.includes('facebook') || lowerText.includes(' fb ') || lowerText.includes('meta')) {
                detectedSource = 'Facebook Ads';
              } else if (lowerText.includes('tiktok') || lowerText.includes('tik tok')) {
                detectedSource = 'TikTok Ads';
              } else if (lowerText.includes('instagram') || lowerText.includes(' ig ')) {
                detectedSource = 'Instagram Ads';
              } else if (lowerText.includes('anuncio solicitando información')) {
                detectedSource = 'Facebook Ads';
              }
              
              // 2. Detectar Nombre del Producto
              if (text.includes(':')) {
                const parts = text.split(':');
                if (parts.length > 1) {
                  // Limpiar puntuación extraña al final (puntos, comas, etc)
                  detectedProduct = parts[1].trim().replace(/[\.,!¡¿\?]+$/, '');
                }
              }

              const { data: newLead } = await supabase.from('leads').insert({
                store_id: store.id,
                name: name,
                phone: phone,
                traffic_source: detectedSource,
                product_name: detectedProduct,
                board_type: 'sales_wa',
                status: 'new'
              }).select().single();
              lead = newLead;
            }

            // D. Guardamos el mensaje
            if (lead) {
              await supabase.from('messages').insert({
                lead_id: lead.id,
                sender_type: 'client',
                content: text
              });
            }
          }
        }
        
        return res.status(200).send('EVENT_RECEIVED');
      } else if (body.object === 'page') {
        // Facebook Webhook para Fan Pages
        for (const entry of body.entry || []) {
          const pageId = entry.id;
          for (const change of entry.changes || []) {
            const value = change.value;
            
            // Solo procesamos comentarios nuevos (verb: add)
            if (value && value.item === 'comment' && value.verb === 'add') {
              const postId = value.post_id;
              const commentId = value.comment_id;
              const senderId = value.from?.id;
              const senderName = value.from?.name || 'Usuario';
              const messageText = value.message || '';

              // Ignoramos si el comentario lo hicimos nosotros mismos como página
              if (senderId && senderId !== pageId) {
                const processAfter = new Date(Date.now() + 2 * 60 * 1000).toISOString();
                
                // Guardar en la tabla pending_comments para que el Cron Job lo procese en 2 minutos
                // Hacemos el insert silencioso si falla por duplicado (ya que comment_id es UNIQUE)
                const { error } = await supabase.from('pending_comments').insert({
                  page_id: pageId,
                  post_id: postId,
                  comment_id: commentId,
                  sender_id: senderId,
                  sender_name: senderName,
                  message: messageText,
                  status: 'PENDING',
                  process_after: processAfter
                });
                
                if (!error) {
                  console.log(`✅ Comentario guardado en cola: Esperando 2 minutos (${commentId})`);
                }
              }
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      } else {
        return res.status(404).send('Not Found');
      }
    } catch (error) {
      console.error('Error procesando webhook:', error);
      return res.status(500).json({ error: error?.message || 'Internal Server Error', stack: error?.stack, fullError: JSON.stringify(error) });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
