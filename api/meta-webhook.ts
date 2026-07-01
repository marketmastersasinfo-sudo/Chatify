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
      const { error: debugError } = await supabase.from('pending_comments').insert({
        page_id: 'DEBUG',
        post_id: 'DEBUG',
        comment_id: 'DEBUG_' + Date.now(),
        sender_id: 'DEBUG',
        sender_name: 'DEBUG',
        message: JSON.stringify(body).substring(0, 1000),
        status: 'FAILED',
        process_after: new Date().toISOString()
      });
      
      if (debugError && body.object !== 'page' && body.object !== 'whatsapp_business_account' && body.object !== 'instagram') {
         return res.status(500).json({ error: 'DB_DEBUG_ERROR', details: debugError });
      }

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
          let { data: store } = await supabase.from('stores').select('*').eq('meta_phone_number_id', waba_number).single();
          
          // Fallback temporal si no encuentra la tienda exacta
          if (!store) {
             const { data: firstStore } = await supabase.from('stores').select('*').limit(1);
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

              // E. Invocar a la IA
              let productInfo = null;
              if (lead.product_name) {
                const { data: prods } = await supabase.from('products').select('*').eq('store_id', store.id).ilike('name', `%${lead.product_name}%`).limit(1);
                if (prods && prods.length > 0) productInfo = prods[0];
              }

              const { handleSophia } = await import('./twilio-webhook.js');
              await handleSophia({
                lead,
                productInfo,
                leadId: lead.id,
                incomingText: text,
                storeTwilioPhone: store.twilio_phone_number || store.meta_phone_number_id || '',
                customerPhone: phone,
                store,
                supabase: supabase as any
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
                
                // 1. FILTRO ANTI-HATERS (Moderación Automática)
                const badWords = ['estafa', 'fraude', 'ladrón', 'ladrones', 'puta', 'mierda', 'estafadores', 'robo', 'basura', 'malo', 'mala', 'pésimo', 'pesimo', 'horrible', 'asco'];
                const isHater = badWords.some(word => messageText.toLowerCase().includes(word));
                
                let isDeleted = false;
                if (isHater) {
                  console.log(`🛑 Mala palabra detectada. Intentando borrar comentario: ${commentId}`);
                  // Obtener token para borrar
                  const { data: pageData } = await supabase.from('connected_pages').select('access_token, store_id').eq('page_id', pageId).single();
                  if (pageData?.access_token) {
                    await fetch(`https://graph.facebook.com/v19.0/${commentId}`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ access_token: pageData.access_token })
                    });
                    isDeleted = true;
                  }
                }

                // 2. SINCRONIZACIÓN CON CRM (Tabla leads) - Fan Pages Genéricas
                const { data: storeData } = await supabase.from('connected_pages').select('store_id').eq('page_id', pageId).single();
                let leadId = null;
                
                // Crear Lead SIEMPRE (con o sin store_id)
                const { data: newLead } = await supabase.from('leads').insert({
                  store_id: storeData?.store_id || null,
                  name: senderName,
                  traffic_source: 'Facebook Ads',
                  board_type: 'social_media',
                  status: isDeleted ? 'moderado' : 'comentario',
                  social_platform: 'facebook',
                  comment_content: messageText,
                  comment_status: isDeleted ? 'deleted' : 'active'
                }).select().single();
                
                if (newLead) leadId = newLead.id;

                // Disparar evento al Pixel si NO es hater
                if (!isDeleted && newLead) {
                  fetch(`https://${req.headers.host || 'localhost'}/api/tracking/fire-event`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leadId: newLead.id, eventName: 'Lead', currency: 'COP' })
                  }).catch(e => console.error('Error disparando pixel:', e));
                }

                // 3. ENVIAR A LA IA (Solo si NO fue eliminado por ser hater)
                if (!isDeleted) {
                  const processAfter = new Date(Date.now() + 2 * 60 * 1000).toISOString();
                  
                  // Guardar en la tabla pending_comments para que el Cron Job lo procese en 2 minutos
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
                    console.log(`✅ Comentario guardado en cola y CRM: Esperando 2 minutos (${commentId})`);
                  }
                } else {
                  console.log(`🗑️ Comentario Hater eliminado y enviado al CRM como Moderado.`);
                }
              }
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      } else if (body.object === 'instagram') {
        // ============ INSTAGRAM WEBHOOK ============
        for (const entry of body.entry || []) {
          const igAccountId = entry.id; // ID de la cuenta de Instagram
          
          for (const change of entry.changes || []) {
            if (change.field === 'comments') {
              const commentData = change.value;
              const commentId = commentData.id;
              const commentText = commentData.text || '';
              const senderId = commentData.from?.id;
              const senderName = commentData.from?.username || 'Usuario IG';
              const mediaId = commentData.media?.id;

              // Ignorar comentarios propios
              if (senderId && senderId !== igAccountId) {
                
                // Buscar la Fan Page asociada a este Instagram
                const { data: pageData } = await supabase
                  .from('connected_pages')
                  .select('page_id, page_name, access_token, store_id')
                  .eq('instagram_account_id', igAccountId)
                  .single();

                if (!pageData?.access_token) {
                  console.log(`⚠️ Instagram ${igAccountId} no tiene Fan Page asociada en connected_pages`);
                  continue;
                }

                // 1. FILTRO ANTI-HATERS (Mismo filtro que Facebook)
                const badWords = ['estafa', 'fraude', 'ladrón', 'ladrones', 'puta', 'mierda', 'estafadores', 'robo', 'basura', 'malo', 'mala', 'pésimo', 'pesimo', 'horrible', 'asco'];
                const isHater = badWords.some(word => commentText.toLowerCase().includes(word));
                
                let isDeleted = false;
                if (isHater) {
                  console.log(`🛑 [IG] Mala palabra detectada. Borrando comentario: ${commentId}`);
                  await fetch(`https://graph.facebook.com/v25.0/${commentId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token: pageData.access_token })
                  });
                  isDeleted = true;
                }

                // 2. CREAR LEAD EN CRM
                const { data: newLead } = await supabase.from('leads').insert({
                  store_id: pageData.store_id || null,
                  name: senderName,
                  traffic_source: 'Instagram Ads',
                  board_type: 'social_media',
                  status: isDeleted ? 'moderado' : 'comentario',
                  social_platform: 'instagram',
                  comment_content: commentText,
                  comment_status: isDeleted ? 'deleted' : 'active'
                }).select().single();

                if (!isDeleted && newLead) {
                  fetch(`https://${req.headers.host || 'localhost'}/api/tracking/fire-event`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leadId: newLead.id, eventName: 'Lead', currency: 'COP' })
                  }).catch(e => console.error('Error disparando pixel:', e));
                }

                // 3. ENCOLAR PARA RESPUESTA IA (Solo si NO es hater)
                if (!isDeleted) {
                  const processAfter = new Date(Date.now() + 2 * 60 * 1000).toISOString();
                  
                  await supabase.from('pending_comments').insert({
                    page_id: igAccountId,
                    post_id: mediaId || 'unknown',
                    comment_id: commentId,
                    sender_id: senderId,
                    sender_name: senderName,
                    message: commentText,
                    status: 'PENDING',
                    platform: 'instagram',
                    process_after: processAfter
                  });
                  
                  console.log(`✅ [IG] Comentario encolado para respuesta IA: ${commentId}`);
                } else {
                  console.log(`🗑️ [IG] Hater eliminado y registrado en CRM.`);
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
