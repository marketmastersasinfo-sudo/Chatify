import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Vercel Pro limit

// ─────────────────────────────────────────
// Supabase (Backend / Serverless)
// ─────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ═══════════════════════════════════════
  // 1. VERIFICACIÓN DE META (GET)
  // ═══════════════════════════════════════
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === 'chatify_meta_secret_2026') {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Token de verificación inválido' });
  }

  // ═══════════════════════════════════════
  // 2. RECEPCIÓN DE EVENTOS (POST)
  // ═══════════════════════════════════════
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // ── WhatsApp ──────────────────────
      if (body.object === 'whatsapp_business_account') {
        return await handleWhatsApp(body, req, res);
      }

      // ── Facebook Fan Pages ────────────
      if (body.object === 'page') {
        return await handleFacebookPage(body, req, res);
      }

      // ── Instagram ─────────────────────
      if (body.object === 'instagram') {
        return await handleInstagram(body, req, res);
      }

      return res.status(404).send('Not Found');
    } catch (error: any) {
      console.error('Error procesando webhook:', error);
      return res.status(500).json({ error: error?.message || 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}


// ═══════════════════════════════════════════════════════════════
// WHATSAPP HANDLER (Pool de Números con Kill Switch)
// ═══════════════════════════════════════════════════════════════
async function handleWhatsApp(body: any, req: VercelRequest, res: VercelResponse) {
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const incomingPhoneId = value?.metadata?.phone_number_id;

  // Solo procesar mensajes entrantes (no status updates)
  if (!value?.messages?.[0] || !incomingPhoneId) {
    return res.status(200).send('EVENT_RECEIVED');
  }

  const message = value.messages[0];
  const contact = value.contacts?.[0];
  const phone = message.from;
  const name = contact?.profile?.name || 'Cliente WhatsApp';
  let text = message.text?.body || '';
  if (message.type === 'button') {
    text = message.button?.text || message.button?.payload || '';
  } else if (message.type === 'interactive') {
    text = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
  }

  // ── A. Buscar el número en el Pool (whatsapp_numbers) ──
  const { data: waNumber } = await supabase
    .from('whatsapp_numbers')
    .select('*, store:stores(*)')
    .eq('phone_number_id', incomingPhoneId)
    .single();

  if (!waNumber?.store) {
    console.log(`⚠️ Número no registrado en pool: ${incomingPhoneId}`);
    return res.status(200).send('EVENT_RECEIVED');
  }

  const store = waNumber.store;

  // 🛑 KILL SWITCH: Si el número está apagado, NO enviar respuestas automáticas.
  // Pero SÍ guardamos el mensaje entrante para que aparezca en el CRM.
  const killSwitchActive = waNumber.is_active === false;

  // ── A2. Extraer Media (Fotos, Audios, Docs) ──
  const msgType = message.type;
  if (msgType && msgType !== 'text') {
    const mediaObj = message[msgType]; // message.image, message.audio, etc.
    if (mediaObj && mediaObj.id) {
      try {
        const { downloadMetaMedia } = await import('./utils/_meta-whatsapp.js');
        const { buffer, mimeType } = await downloadMetaMedia(mediaObj.id, waNumber.access_token);
        
        // Upload to Supabase Storage
        const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
        const fileName = `media_${store.id}_${Date.now()}.${ext}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chatify_media')
          .upload(fileName, buffer, { contentType: mimeType });
          
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('chatify_media')
            .getPublicUrl(uploadData.path);
            
          let tag = 'DOC';
          if (msgType === 'image') tag = 'IMG';
          if (msgType === 'video') tag = 'VID';
          if (msgType === 'audio') tag = 'SND';
          
          text = `[${tag}:${publicUrl}] ${text}`;
          
          // Transcribir audio si es SND
          if (tag === 'SND') {
            try {
              const { transcribeAudio } = await import('./utils/ai-router.js');
              const transcription = await transcribeAudio(buffer, mimeType, store.organization_id, store.id);
              if (transcription) {
                text += `\n\n🎤 Transcripción:\n"${transcription}"`;
              }
            } catch (e: any) {
              console.error('Audio transcription failed:', e.message);
            }
          }
        }
      } catch (e: any) {
        console.error(`Media download failed for ${msgType}:`, e.message);
      }
    }
  }

  // ── B. Buscar o crear Lead ──
  const { data: allLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('phone', phone)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  // Preferir lead de sales_wa
  let lead = allLeads?.find((l: any) => l.board_type === 'sales_wa') || null;

  if (!lead) {
    // Walink Smart Parser (Anti-Friction)
    let detectedProduct = null;
    let detectedSource = 'WhatsApp Orgánico';
    const lowerText = text.toLowerCase();

    if (lowerText.includes('facebook') || lowerText.includes(' fb ') || lowerText.includes('meta') || lowerText.includes('anuncio solicitando información')) {
      detectedSource = 'Facebook Ads';
    } else if (lowerText.includes('tiktok') || lowerText.includes('tik tok')) {
      detectedSource = 'TikTok Ads';
    } else if (lowerText.includes('instagram') || lowerText.includes(' ig ')) {
      detectedSource = 'Instagram Ads';
    }

    if (text.includes(':')) {
      const parts = text.split(':');
      if (parts.length > 1) {
        detectedProduct = parts[1].trim().replace(/[\.,!¡¿\?]+$/, '');
      }
    }

    const { data: newLead } = await supabase.from('leads').insert({
      store_id: store.id,
      name,
      phone,
      traffic_source: detectedSource,
      product_name: detectedProduct,
      board_type: 'sales_wa',
      status: 'new'
    }).select().single();

    lead = newLead;
  }

  if (!lead) {
    return res.status(200).send('EVENT_RECEIVED');
  }

  // ── C. Guardar el mensaje entrante (SIEMPRE, aunque Kill Switch esté activo) ──
  await supabase.from('messages').insert({
    lead_id: lead.id,
    sender_type: 'client',
    content: text
  });

  // 🛑 Si Kill Switch está activo, NO invocar la IA ni responder.
  // El mensaje ya quedó guardado en el CRM para que lo veas.
  if (killSwitchActive) {
    return res.status(200).send('EVENT_RECEIVED');
  }

  // ── D. Invocar IA (Sophia) ──
  let productInfo = null;
  if (lead.product_name) {
    const { data: prods } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .ilike('name', `%${lead.product_name}%`)
      .limit(1);
    if (prods && prods.length > 0) productInfo = prods[0];
  }

  // Inyectar los datos del pool al store para que handleSophia use el token correcto
  store.meta_access_token = waNumber.access_token;
  store.meta_phone_number_id = waNumber.phone_number_id;

  const { handleSophia } = await import('./utils/_sophia-handler.js');
  await handleSophia({
    lead,
    productInfo,
    leadId: lead.id,
    incomingText: text,
    storeTwilioPhone: waNumber.phone_number_id,
    customerPhone: phone,
    store,
    supabase: supabase as any
  });

  return res.status(200).send('EVENT_RECEIVED');
}


// ═══════════════════════════════════════════════════════════════
// FACEBOOK FAN PAGE HANDLER (Moderación + CRM)
// ═══════════════════════════════════════════════════════════════
async function handleFacebookPage(body: any, req: VercelRequest, res: VercelResponse) {
  for (const entry of body.entry || []) {
    const pageId = entry.id;

    // A. Manejo de DMs de Messenger (entry.messaging)
    for (const msgEvent of entry.messaging || []) {
      const senderId = msgEvent.sender?.id;
      const text = msgEvent.message?.text || '';
      if (!senderId || senderId === pageId || !text) continue;

      let { data: existingLead } = await supabase
        .from('leads')
        .select('*')
        .eq('social_platform', 'facebook')
        .eq('board_type', 'social_media')
        .order('created_at', { ascending: false })
        .limit(1);

      let leadObj = existingLead?.[0];

      if (!leadObj) {
        const { data: pageData } = await supabase.from('connected_pages').select('store_id').eq('page_id', pageId).maybeSingle();
        const { data: created } = await supabase.from('leads').insert({
          store_id: pageData?.store_id || null,
          name: `Cliente Messenger (${senderId.slice(-4)})`,
          traffic_source: 'Facebook Messenger',
          board_type: 'social_media',
          status: 'charla_dm',
          social_platform: 'facebook'
        }).select().single();
        leadObj = created;
      } else {
        if (['comentario', 'dm_enviado'].includes(leadObj.status)) {
          await supabase.from('leads').update({ status: 'charla_dm' }).eq('id', leadObj.id);
        }
      }

      if (leadObj) {
        await supabase.from('messages').insert({
          lead_id: leadObj.id,
          sender_type: 'client',
          content: text
        });

        // Disparar evento de tracking PageView para conversación en DM
        fetch(`https://${req.headers.host || 'localhost'}/api/tracking/fire-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: leadObj.id, eventName: 'PageView', currency: 'COP' })
        }).catch(console.error);
      }
    }

    // B. Manejo de Comentarios en Facebook
    for (const change of entry.changes || []) {
      const value = change.value;

      if (value?.item !== 'comment' || value?.verb !== 'add') continue;

      const postId = value.post_id;
      const commentId = value.comment_id;
      const senderId = value.from?.id;
      const senderName = value.from?.name || 'Usuario';
      const messageText = value.message || '';

      // Ignorar comentarios propios
      if (!senderId || senderId === pageId) continue;

      // 1. Filtro Anti-Haters
      const badWords = ['estafa', 'fraude', 'ladrón', 'ladrones', 'puta', 'mierda', 'estafadores', 'robo', 'basura', 'malo', 'mala', 'pésimo', 'pesimo', 'horrible', 'asco'];
      const isHater = badWords.some(word => messageText.toLowerCase().includes(word));

      let isDeleted = false;
      if (isHater) {
        const { data: pageData } = await supabase.from('connected_pages').select('access_token').eq('page_id', pageId).single();
        if (pageData?.access_token) {
          await fetch(`https://graph.facebook.com/v19.0/${commentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: pageData.access_token })
          });
          isDeleted = true;
        }
      }

      // 2. Crear Lead en CRM
      const { data: storeData } = await supabase.from('connected_pages').select('store_id').eq('page_id', pageId).single();

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

      // 3. Disparar Pixel (solo si NO es hater)
      if (!isDeleted && newLead) {
        fetch(`https://${req.headers.host || 'localhost'}/api/tracking/fire-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: newLead.id, eventName: 'Lead', currency: 'COP' })
        }).catch(e => console.error('Error disparando pixel:', e));
      }

      // 4. Encolar para respuesta IA (solo si NO es hater)
      if (!isDeleted) {
        const processAfter = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        await supabase.from('pending_comments').insert({
          page_id: pageId,
          post_id: postId,
          comment_id: commentId,
          sender_id: senderId,
          sender_name: senderName,
          message: messageText,
          status: 'PENDING',
          process_after: processAfter
        });
      }
    }
  }

  return res.status(200).send('EVENT_RECEIVED');
}


// ═══════════════════════════════════════════════════════════════
// INSTAGRAM HANDLER (Moderación + CRM)
// ═══════════════════════════════════════════════════════════════
async function handleInstagram(body: any, req: VercelRequest, res: VercelResponse) {
  for (const entry of body.entry || []) {
    const igAccountId = entry.id;

    // A. DMs de Instagram Direct (entry.messaging)
    for (const msgEvent of entry.messaging || []) {
      const senderId = msgEvent.sender?.id;
      const text = msgEvent.message?.text || '';
      if (!senderId || senderId === igAccountId || !text) continue;

      let { data: existingLead } = await supabase
        .from('leads')
        .select('*')
        .eq('social_platform', 'instagram')
        .eq('board_type', 'social_media')
        .order('created_at', { ascending: false })
        .limit(1);

      let leadObj = existingLead?.[0];

      if (!leadObj) {
        const { data: pageData } = await supabase
          .from('connected_pages')
          .select('store_id')
          .eq('instagram_account_id', igAccountId)
          .maybeSingle();

        const { data: created } = await supabase.from('leads').insert({
          store_id: pageData?.store_id || null,
          name: `Cliente Instagram Direct`,
          traffic_source: 'Instagram Direct',
          board_type: 'social_media',
          status: 'charla_dm',
          social_platform: 'instagram'
        }).select().single();
        leadObj = created;
      } else {
        if (['comentario', 'dm_enviado'].includes(leadObj.status)) {
          await supabase.from('leads').update({ status: 'charla_dm' }).eq('id', leadObj.id);
        }
      }

      if (leadObj) {
        await supabase.from('messages').insert({
          lead_id: leadObj.id,
          sender_type: 'client',
          content: text
        });

        fetch(`https://${req.headers.host || 'localhost'}/api/tracking/fire-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: leadObj.id, eventName: 'PageView', currency: 'COP' })
        }).catch(console.error);
      }
    }

    // B. Comentarios en Instagram
    for (const change of entry.changes || []) {
      if (change.field !== 'comments') continue;

      const commentData = change.value;
      const commentId = commentData.id;
      const commentText = commentData.text || '';
      const senderId = commentData.from?.id;
      const senderName = commentData.from?.username || 'Usuario IG';
      const mediaId = commentData.media?.id;

      if (!senderId || senderId === igAccountId) continue;

      const { data: pageData } = await supabase
        .from('connected_pages')
        .select('page_id, page_name, access_token, store_id')
        .eq('instagram_account_id', igAccountId)
        .single();

      if (!pageData?.access_token) continue;

      // 1. Filtro Anti-Haters
      const badWords = ['estafa', 'fraude', 'ladrón', 'ladrones', 'puta', 'mierda', 'estafadores', 'robo', 'basura', 'malo', 'mala', 'pésimo', 'pesimo', 'horrible', 'asco'];
      const isHater = badWords.some(word => commentText.toLowerCase().includes(word));

      let isDeleted = false;
      if (isHater) {
        await fetch(`https://graph.facebook.com/v25.0/${commentId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: pageData.access_token })
        });
        isDeleted = true;
      }

      // 2. Crear Lead en CRM
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

      // 3. Encolar para respuesta IA
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
      }
    }
  }

  return res.status(200).send('EVENT_RECEIVED');
}
