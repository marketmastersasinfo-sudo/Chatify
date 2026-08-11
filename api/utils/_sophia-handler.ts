/**
 * _sophia-handler.ts
 * Core AI handler for WhatsApp conversations — Direct Meta Cloud API (No Twilio)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Cache global para cobertura
let cachedCoverage: string | null = null;
let lastCoverageFetch = 0;

/** Get the full body of the first confirmation template sent to this customer. */
async function getTemplateMessageContext(leadId: string): Promise<string> {
  try {
    const { data: templateMsg } = await supabase
      .from('messages')
      .select('content')
      .eq('lead_id', leadId)
      .eq('sender_type', 'human')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    return templateMsg?.content || '';
  } catch {
    return '';
  }
}

export async function handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: sb, platform = 'whatsapp' }: {
  lead: any; productInfo: any; leadId: string; incomingText: string;
  storeTwilioPhone: string; customerPhone: string; store: any; supabase: any;
  platform?: 'whatsapp' | 'facebook' | 'instagram';
}) {
  // AI keys are now managed by the cascade router — no single-key check needed

  // Fetch last 12 messages for context (excluding system messages)
  const { data: recentMessages } = await sb
    .from('messages')
    .select('sender_type, content')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (!recentMessages) return;
  recentMessages.reverse();

  // Check if AI is paused
  let isAIPaused = false;
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    if (recentMessages[i].content === '[SISTEMA] PAUSAR_IA') { isAIPaused = true; break; }
    if (recentMessages[i].content === '[SISTEMA] REANUDAR_IA') { isAIPaused = false; break; }
  }
  if (isAIPaused) return;

  const { buildSophiaPrompt } = await import('./_sophia-prompt.js');
  const { routeAIRequest } = await import('./ai-router.js');

  const storeSlug = store?.slug || '';
  if (!cachedCoverage || Date.now() - lastCoverageFetch > 1000 * 60 * 60) {
    try {
      const res = await fetch(`https://shopyeasy-seven.vercel.app/api/coverage${storeSlug ? `?store=${storeSlug}` : ''}`);
      if (res.ok) {
        cachedCoverage = JSON.stringify(await res.json());
        lastCoverageFetch = Date.now();
      }
    } catch (e) {
      console.error('Error fetching coverage:', e);
    }
  }

  // Get the full confirmation template message
  const variantInfo = await getTemplateMessageContext(leadId);

  const promptOpts = { storeCountry: store?.country || 'Colombia' };
  const systemPrompt = buildSophiaPrompt(lead || {}, productInfo, variantInfo, cachedCoverage || undefined, promptOpts);
  
  const aiMessages: any[] = [];

  for (const msg of recentMessages) {
    if (msg.content.startsWith('[')) continue;
    const cleanContent = msg.content.replace(/\[(IMG|VID|SND|DOC|GIF):.*?\]/g, '').trim();
    if (!cleanContent) continue;

    aiMessages.push({
      role: msg.sender_type === 'client' ? 'user' : 'assistant',
      content: cleanContent
    });
  }

  // ── PRE-PROCESAMIENTO RÁPIDO PARA BOTONES Y ATAJOS (Bypass IA parcial) ──
  const cleanIncoming = incomingText.trim().replace(/^(•\t|- )/, '').trim().toLowerCase();
  let preParsedOutput = null;

  if (lead?.board_type === 'logistics' && (cleanIncoming === 'todo está correcto' || cleanIncoming === 'todo correcto' || cleanIncoming === 'si' || cleanIncoming === 'sí')) {
    preParsedOutput = {
      reply: '¡Excelente! Tengo toda la información para tu pedido.',
      intent: 'OrderConfirmed'
    };
  }

  let aiOutput = '';
  try {
    if (preParsedOutput) {
      aiOutput = JSON.stringify(preParsedOutput);
    } else {
      aiOutput = await routeAIRequest({
        organizationId: store?.organization_id || '',
        module: 'whatsapp',
        systemPrompt,
        messages: aiMessages,
        requireJson: true,
        storeId: store?.id,
        leadId
      });
    }

    let cleanedOutput = aiOutput.trim() || '{}';
    if (cleanedOutput.startsWith('```')) {
      cleanedOutput = cleanedOutput.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/i, '').trim();
    }
    
    let parsed: { reply: string, intent: string, extracted_name?: string, extracted_city?: string, extracted_address?: string, extracted_last_name?: string, extracted_department?: string, extracted_sector?: string, extracted_postal_code?: string, extracted_total_price?: string | number, extracted_phone?: string, extracted_product_name?: string, extracted_zone?: string, extracted_references?: string } = { reply: '', intent: 'None' };
    
    try {
      parsed = JSON.parse(cleanedOutput);
    } catch {
      console.error('Failed to parse AI JSON:', cleanedOutput);
      const replyMatch = cleanedOutput.match(/"reply"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/is);
      if (replyMatch) {
        parsed.reply = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      } else {
        parsed.reply = "Disculpa, tuve un pequeño problema procesando tu mensaje. ¿Me lo puedes repetir? 🙏";
      }
      const intentMatch = cleanedOutput.match(/"intent"\s*:\s*"([^"]+)"/i);
      if (intentMatch) {
        parsed.intent = intentMatch[1];
      }
    }

    let aiReply = parsed.reply || '';
    if (!aiReply) return;

    // Disparar Tracking Semántico si se detectó una intención válida
    if (parsed.intent === 'AddToCart' || parsed.intent === 'InitiateCheckout') {
      const { firePixelEvent } = await import('./_tracking.js');
      await firePixelEvent(sb, leadId, parsed.intent, lead?.total_price || 0, 'COP', customerPhone).catch(console.error);
    }

    // Guardar dirección si la IA la extrajo
    let newAddress = lead?.address || '';
    let newCity = lead?.city || '';
    let addressUpdated = false;
    let facadeChanged = false;

    if (parsed.extracted_address || parsed.extracted_city || parsed.extracted_last_name || parsed.extracted_department || parsed.extracted_sector || parsed.extracted_postal_code || parsed.extracted_total_price || parsed.extracted_name || parsed.extracted_phone || parsed.extracted_product_name || parsed.extracted_zone || parsed.extracted_references) {
      const updateData: any = {};
      const normalizeStr = (str: string) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      
      const cleanOldAddr = normalizeStr(lead?.address);
      const cleanNewAddr = normalizeStr(parsed.extracted_address);
      if (parsed.extracted_address && cleanOldAddr !== cleanNewAddr) { updateData.address = parsed.extracted_address; newAddress = parsed.extracted_address; addressUpdated = true; facadeChanged = true; }
      
      const cleanOldCity = normalizeStr(lead?.city);
      const cleanNewCity = normalizeStr(parsed.extracted_city);
      if (parsed.extracted_city && cleanOldCity !== cleanNewCity) { updateData.city = parsed.extracted_city; newCity = parsed.extracted_city; addressUpdated = true; facadeChanged = true; }
      
      if (parsed.extracted_name) { updateData.name = parsed.extracted_name; addressUpdated = true; }
      if (parsed.extracted_last_name) { updateData.last_name = parsed.extracted_last_name; addressUpdated = true; }
      if (parsed.extracted_department && !lead?.department) { updateData.department = parsed.extracted_department; addressUpdated = true; }
      if (parsed.extracted_sector && !lead?.sector) { updateData.sector = parsed.extracted_sector; addressUpdated = true; }
      if (parsed.extracted_postal_code && !lead?.postal_code) { updateData.postal_code = parsed.extracted_postal_code; addressUpdated = true; }
      
      if (parsed.extracted_product_name && parsed.extracted_product_name !== lead?.product_name) { updateData.product_name = parsed.extracted_product_name; addressUpdated = true; }
      if (parsed.extracted_phone) { 
         updateData.contact_phone = parsed.extracted_phone;
         addressUpdated = true;
      }
      
      let newNotes = lead?.notes || '';
      let notesUpdated = false;
      if (parsed.extracted_zone && !newNotes.includes('Zona:')) {
        newNotes += `\nZona: ${parsed.extracted_zone}`;
        notesUpdated = true;
      }
      if (parsed.extracted_references && !newNotes.includes('Referencias:')) {
        newNotes += `\nReferencias: ${parsed.extracted_references}`;
        notesUpdated = true;
      }
      if (notesUpdated) {
        updateData.notes = newNotes.trim();
        lead.notes = updateData.notes;
        addressUpdated = true;
      }
      
      if (parsed.extracted_total_price) { updateData.total_price = Number(parsed.extracted_total_price); }
      
      if (addressUpdated) {
        if (facadeChanged && lead && (lead.status === 'verifying_address' || lead.status === 'closed' || lead.status === 'confirmado')) {
          updateData.status = 'negotiating';
          lead.status = 'negotiating';
        }
        await sb.from('leads').update(updateData).eq('id', leadId);
      }
    }

    // ══════════════════════════════════════════════════════
    // MOVER LEAD AUTOMÁTICAMENTE o INTERCEPTAR STREET VIEW
    // ══════════════════════════════════════════════════════
    const leadBoardType = lead?.board_type || '';

    // SEGURIDAD ANTI-ALUCINACIONES DE LA IA:
    const hasMandatoryData = !!(newAddress && newCity);
    if ((parsed.intent === 'Purchase' || parsed.intent === 'OrderConfirmed') && !hasMandatoryData) {
      parsed.intent = 'InitiateCheckout';
      console.log('Downgraded Purchase to InitiateCheckout because mandatory data is missing');
    }

    // Lógica de embudo de ventas (Inbound)
    if (leadBoardType === 'sales_wa') {
      if (parsed.intent === 'None' || parsed.intent === 'Support' || parsed.intent === 'General') {
        if (lead?.status === 'new' || lead?.status === 'cold_lead') {
          await sb.from('leads').update({ status: 'inquiry' }).eq('id', leadId);
        }
      } else if (parsed.intent === 'AddToCart' || parsed.intent === 'InitiateCheckout') {
        if (lead?.status !== 'negotiating' && lead?.status !== 'verifying_address') {
          await sb.from('leads').update({ status: 'negotiating' }).eq('id', leadId);
        }
      }
    }

    // ── OMNICHANNEL API send helper ──
    let sendText: (text: string) => Promise<any>;
    let sendImage: (url: string, caption?: string) => Promise<any>;

    if (platform === 'whatsapp') {
      const { sendMetaText, sendMetaImage } = await import('./_meta-whatsapp.js');
      const metaOpts = {
        phoneNumberId: store.meta_phone_number_id,
        accessToken: store.meta_access_token,
        to: customerPhone
      };
      sendText = (text) => sendMetaText(metaOpts, text);
      sendImage = (url, caption) => sendMetaImage(metaOpts, url, caption);
    } else {
      const { data: pageData } = await sb.from('connected_pages').select('page_id, access_token').eq('store_id', store.id).limit(1).single();
      const metaOpts = {
        pageId: pageData?.page_id || '',
        pageToken: pageData?.access_token || '',
        to: customerPhone // sender_id is stored here for FB/IG
      };
      const { sendMessengerText, sendMessengerImage } = await import('./_meta-messenger.js');
      sendText = (text) => sendMessengerText(metaOpts, text);
      sendImage = (url, caption) => sendMessengerImage(metaOpts, url, caption);
    }

    if (parsed.intent === 'Purchase' || parsed.intent === 'OrderConfirmed') {
      
      // INTERCEPTAR PARA STREET VIEW (Solo si tenemos dirección y ciudad y no estamos verificando ya)
      const isAlreadyClosed = ['confirmado', 'closed', 'recovered'].includes(lead?.status);
      
      if (!isAlreadyClosed && lead?.status !== 'verifying_address' && newAddress && newCity) {
        await sb.from('leads').update({ status: 'verifying_address' }).eq('id', leadId);
        const { data: orgData } = await sb.from('organizations').select('google_maps_api_key').eq('id', store.organization_id);
        const apiKey = (orgData as any)?.[0]?.google_maps_api_key || 'AIzaSyD3amxq4t9GA892zO4C70nbnPGqnG4Ct-A';
        const mapQuery = encodeURIComponent(`${newAddress}, ${newCity}`);
        
        // ── VERIFICAR SI HAY STREET VIEW DISPONIBLE PRIMERO ──
        const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${mapQuery}&key=${apiKey}`;
        let hasStreetView = false;
        try {
          const metaRes = await fetch(metaUrl);
          const metaData = await metaRes.json();
          if (metaData.status === 'OK') {
            hasStreetView = true;
          }
        } catch (e) {
          console.error('Error fetching StreetView metadata:', e);
        }

        if (hasStreetView) {
          const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${mapQuery}&key=${apiKey}`;
          aiReply = `¡Excelente! 🎉 Tengo toda la información. Para asegurar que la entrega de tu pedido sea perfecta, ¿esta es la fachada correcta de tu dirección? 🏠📍`;
          
          // Send via Meta API (text + image in one message)
          await sendImage(streetViewUrl, aiReply);
          await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[IMG:${streetViewUrl}] ${aiReply}` });
        } else {
          // Fallback en texto si no hay imagen
          aiReply = `¡Excelente! 🎉 Tengo toda la información. Para asegurar que la entrega de tu pedido sea perfecta, por favor confírmame si tu dirección es correcta o si hay alguna observación adicional para el mensajero. 🏠📍`;
          await sendText(aiReply);
          await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: aiReply });
        }
        
        // Log Street View usage
        try {
          const month = new Date().toISOString().substring(0, 7); // YYYY-MM
          await (sb as any).rpc('increment_api_usage', {
            p_org_id: store.organization_id,
            p_store_id: store.id,
            p_api_name: 'google_street_view',
            p_month: month,
            p_cost: hasStreetView ? 0.007 : 0.0
          });
        } catch(e) { }
        
        return;
      }

      // CIERRE NORMAL DE PEDIDO (Si ya se verificó la dirección o se saltó)
      if (!isAlreadyClosed) {
        if (leadBoardType.includes('remarketing')) {
          await sb.from('leads').update({ status: 'recovered', recovery_confirmed_at: new Date().toISOString() }).eq('id', leadId);
        } else if (leadBoardType === 'logistics') {
          await sb.from('leads').update({ status: 'confirmado' }).eq('id', leadId);
          try {
            const { firePixelEvent } = await import('./_tracking.js');
            await firePixelEvent(sb as any, leadId, 'Purchase', lead?.total_price || 0, 'COP', customerPhone);
          } catch (e) {
            console.error('Tracking Error on Purchase (Sophia)', e);
          }
        } else if (leadBoardType === 'sales_wa') {
          await sb.from('leads').update({ status: 'closed' }).eq('id', leadId);
        }
        
        try {
          const { firePixelEvent } = await import('./_tracking.js');
          await firePixelEvent(sb, leadId, 'Purchase', lead?.total_price || 0, 'COP', customerPhone);
        } catch (e) {
          console.error('Tracking Error', e);
        }
      }
    }


    // ══════════════════════════════════════════════════════
    // EXTRACCIÓN DE MULTIMEDIA (Imágenes / Audios / Videos / Docs)
    // ══════════════════════════════════════════════════════
    const mediaUrlsToSend: string[] = [];
    let textForDB = aiReply;
    let textForSend = aiReply;

    let assets: any[] = [];
    try { 
      if (productInfo?.media_assets) {
        assets = typeof productInfo.media_assets === 'string' 
          ? JSON.parse(productInfo.media_assets) 
          : productInfo.media_assets;
      }
    } catch {}

    console.log(`[MEDIA-DEBUG] AI reply tags check. Asset count: ${assets.length}. Reply preview: "${aiReply.substring(0, 200)}"`);

    // ── SAFETY NET: Ensure enough images when customer asks for photos ──
    if (Array.isArray(assets) && assets.length > 0) {
      const existingTagCount = assets.filter(a => a.tag && textForDB.includes(a.tag)).length;
      const customerAskedPhotos = /(?:manda|env[ií]a|muestra|m[aá]ndame|pasa|mand[aá]|dame|quiero\s+ver|otras?\s+foto|diseños|colores|modelos|estilos)/i.test(incomingText) && /(?:foto|fotos|imagen|imágenes|im[aá]gen|diseños|colores|modelos|estilos)/i.test(incomingText);
      const mentionsPhotos = /(?:aqu[ií]\s+tienes?|te\s+env[ií]o?|muestro?)\s/i.test(textForDB) && /(?:foto|imagen|fotos|imágenes|diseños|colores)/i.test(textForDB);
      
      const minPhotos = customerAskedPhotos ? 1 : (mentionsPhotos ? 1 : 0);
      
      if (minPhotos > 0 && existingTagCount < minPhotos) {
        console.log(`[MEDIA-DEBUG] SAFETY NET: Need ${minPhotos} photos but only ${existingTagCount} tags. Injecting more.`);
        const imageAssets = assets.filter(a => a.type === 'image');
        let injected = 0;
        for (const asset of imageAssets) {
          if (existingTagCount + injected >= minPhotos) break;
          if (asset.tag && !textForDB.includes(asset.tag)) {
            textForDB += ` ${asset.tag}`;
            injected++;
            console.log(`[MEDIA-DEBUG] SAFETY NET: Injected tag ${asset.tag}`);
          }
        }
      }
    }

    if (Array.isArray(assets)) {
      for (const asset of assets) {
        const hasTag = asset.tag && textForDB.includes(asset.tag);
        console.log(`[MEDIA-DEBUG] Checking tag "${asset.tag}" in reply: ${hasTag ? 'FOUND' : 'not found'}`);
        if (hasTag) {
          // Regenerate signed URL from path (stored URLs may be expired)
          let freshUrl = asset.url;
          if (asset.path) {
            const { data: signedData } = await supabase.storage
              .from('chatify_media')
              .createSignedUrl(asset.path, 60 * 60 * 24 * 365 * 10); // 10 years
            if (signedData?.signedUrl) freshUrl = signedData.signedUrl;
          } else if (asset.url) {
            // Legacy: extract path from URL and regenerate
            const match = asset.url.match(/chatify_media\/(.+?)(\?|$)/);
            if (match) {
              const { data: signedData } = await supabase.storage
                .from('chatify_media')
                .createSignedUrl(decodeURIComponent(match[1]), 60 * 60 * 24 * 365 * 10); // 10 years
              if (signedData?.signedUrl) freshUrl = signedData.signedUrl;
            }
          }
          mediaUrlsToSend.push(freshUrl);
          
          let dbPrefix = 'IMG';
          if (asset.type === 'video') dbPrefix = 'VID';
          else if (asset.type === 'audio') dbPrefix = 'SND';
          else if (asset.type === 'pdf' || asset.type === 'file') dbPrefix = 'DOC';
          else if (asset.type === 'gif') dbPrefix = 'GIF';

          textForDB = textForDB.split(asset.tag).join(`[${dbPrefix}:${freshUrl}]`);
          textForSend = textForSend.split(asset.tag).join('');
        }
      }
    }

    // Limpieza preventiva
    textForSend = textForSend.replace(/\[(MEDIA|IMG|AUDIO|VIDEO|FILE|GIF)_\d+\]/g, '').trim();
    textForDB = textForDB.trim();

    console.log(`[MEDIA-DEBUG] Media URLs to send: ${mediaUrlsToSend.length}. Text: "${textForSend.substring(0, 100)}"`);

    // ── SAVE TO DB FIRST (so CRM always shows the message) ──
    await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: textForDB });

    // ── Send via Meta Cloud API (using sendMetaImage which handles upload+send) ──
    if (textForSend && mediaUrlsToSend.length > 0) {
      // Send first image with caption text
      try {
        const result = await sendImage(mediaUrlsToSend[0], textForSend);
        console.log(`[MEDIA-DEBUG] First image send result:`, JSON.stringify(result));
        if (result && (result as any).skipped) {
          await sendText(textForSend);
        }
      } catch (imgErr: any) {
        console.error(`[MEDIA-DEBUG] First image send FAILED:`, imgErr.message);
        await sendText(textForSend);
      }
    } else if (textForSend) {
      await sendText(textForSend);
    } else if (mediaUrlsToSend.length > 0) {
      try {
        await sendImage(mediaUrlsToSend[0]);
      } catch (imgErr: any) {
        console.error(`[MEDIA-DEBUG] Image-only send FAILED:`, imgErr.message);
      }
    } else {
      await sendText('👍');
    }

    // Send additional images one by one with sendMetaImage
    for (let i = 1; i < mediaUrlsToSend.length && i < 5; i++) {
      try {
        console.log(`[MEDIA-DEBUG] Sending additional image ${i}/${mediaUrlsToSend.length - 1}`);
        const addResult = await sendImage(mediaUrlsToSend[i]);
        console.log(`[MEDIA-DEBUG] Additional image ${i} result:`, JSON.stringify(addResult));
      } catch (imgErr: any) {
        console.error(`[MEDIA-DEBUG] Additional image ${i} FAILED:`, imgErr.message);
      }
    }

  } catch (err: any) {
    console.error('Sophia AI Error:', err);
    await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[BOT CRASH] Error: ${err.message}` });
  }
}
