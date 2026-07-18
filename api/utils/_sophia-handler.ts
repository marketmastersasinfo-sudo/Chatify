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

export async function handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: sb }: {
  lead: any; productInfo: any; leadId: string; incomingText: string;
  storeTwilioPhone: string; customerPhone: string; store: any; supabase: any;
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

  try {
    const aiOutput = await routeAIRequest({
      organizationId: store?.organization_id || '',
      module: 'whatsapp',
      systemPrompt,
      messages: aiMessages,
      requireJson: true,
      storeId: store?.id,
      leadId
    });

    let cleanedOutput = aiOutput.trim() || '{}';
    if (cleanedOutput.startsWith('```')) {
      cleanedOutput = cleanedOutput.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/i, '').trim();
    }
    
    let parsed: { reply: string, intent: string, extracted_city?: string, extracted_address?: string, extracted_last_name?: string, extracted_department?: string, extracted_sector?: string, extracted_postal_code?: string, extracted_total_price?: string | number } = { reply: '', intent: 'None' };
    
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

    if (parsed.extracted_address || parsed.extracted_city || parsed.extracted_last_name || parsed.extracted_department || parsed.extracted_sector || parsed.extracted_postal_code || parsed.extracted_total_price) {
      const updateData: any = {};
      const cleanOldAddr = (lead?.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanNewAddr = (parsed.extracted_address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (parsed.extracted_address && cleanOldAddr !== cleanNewAddr) { updateData.address = parsed.extracted_address; newAddress = parsed.extracted_address; addressUpdated = true; facadeChanged = true; }
      
      const cleanOldCity = (lead?.city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanNewCity = (parsed.extracted_city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (parsed.extracted_city && cleanOldCity !== cleanNewCity) { updateData.city = parsed.extracted_city; newCity = parsed.extracted_city; addressUpdated = true; facadeChanged = true; }
      
      if (parsed.extracted_last_name && !lead?.last_name) { updateData.last_name = parsed.extracted_last_name; addressUpdated = true; }
      if (parsed.extracted_department && !lead?.department) { updateData.department = parsed.extracted_department; addressUpdated = true; }
      if (parsed.extracted_sector && !lead?.sector) { updateData.sector = parsed.extracted_sector; addressUpdated = true; }
      if (parsed.extracted_postal_code && !lead?.postal_code) { updateData.postal_code = parsed.extracted_postal_code; addressUpdated = true; }
      
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
        if (lead?.status !== 'negotiating' && lead?.status !== 'verifying_address' && lead?.status !== 'closed') {
          await sb.from('leads').update({ status: 'negotiating' }).eq('id', leadId);
        }
      }
    }

    // ── Meta API send helper ──
    const { sendMetaText, sendMetaImage } = await import('./_meta-whatsapp.js');
    const metaOpts = {
      phoneNumberId: store.meta_phone_number_id,
      accessToken: store.meta_access_token,
      to: customerPhone
    };

    if (parsed.intent === 'Purchase' || parsed.intent === 'OrderConfirmed') {
      
      // INTERCEPTAR PARA STREET VIEW (Solo si tenemos dirección y ciudad y no estamos verificando ya)
      if (lead?.status !== 'verifying_address' && newAddress && newCity) {
        await sb.from('leads').update({ status: 'verifying_address' }).eq('id', leadId);
        const { data: orgData } = await sb.from('organizations').select('google_maps_api_key').eq('id', store.organization_id);
        const apiKey = (orgData as any)?.[0]?.google_maps_api_key || 'AIzaSyD3amxq4t9GA892zO4C70nbnPGqnG4Ct-A';
        const mapQuery = encodeURIComponent(`${newAddress}, ${newCity}`);
        const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${mapQuery}&key=${apiKey}`;
        
        aiReply = `¡Excelente! 🎉 Tengo toda la información. Para asegurar que la entrega de tu pedido sea perfecta, ¿esta es la fachada correcta de tu dirección? 🏠📍`;
        
        // Send via Meta API (text + image in one message)
        await sendMetaImage(metaOpts, streetViewUrl, aiReply);
        await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[IMG:${streetViewUrl}] ${aiReply}` });
        
        // Log Street View usage
        try {
          const month = new Date().toISOString().substring(0, 7); // YYYY-MM
          await (sb as any).rpc('increment_api_usage', {
            p_org_id: store.organization_id,
            p_store_id: store.id,
            p_api_name: 'google_street_view',
            p_month: month,
            p_cost: 0.007 // $7 per 1000 = $0.007 each
          });
        } catch(e) {
          // Ignore if RPC doesn't exist
        }
        
        return;
      }

      // CIERRE NORMAL DE PEDIDO (Si ya se verificó la dirección)
      if (lead?.status === 'verifying_address') {
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
        const { firePixelEvent } = await import('./_tracking.js');
        await firePixelEvent(sb, leadId, 'Purchase', lead?.total_price || 0, 'COP', customerPhone).catch(console.error);
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

    if (Array.isArray(assets)) {
      for (const asset of assets) {
        if (asset.tag && textForDB.includes(asset.tag)) {
          mediaUrlsToSend.push(asset.url);
          
          let dbPrefix = 'IMG';
          if (asset.type === 'video') dbPrefix = 'VID';
          else if (asset.type === 'audio') dbPrefix = 'SND';
          else if (asset.type === 'pdf' || asset.type === 'file') dbPrefix = 'DOC';
          else if (asset.type === 'gif') dbPrefix = 'GIF';

          textForDB = textForDB.split(asset.tag).join(`[${dbPrefix}:${asset.url}]`);
          textForSend = textForSend.split(asset.tag).join('');
        }
      }
    }

    // Limpieza preventiva
    textForSend = textForSend.replace(/\[(MEDIA|AUDIO|VIDEO|FILE|GIF)_\d+\]/g, '').trim();
    textForDB = textForDB.trim();

    // ── Send via Meta Cloud API ──
    if (textForSend && mediaUrlsToSend.length > 0) {
      await sendMetaImage(metaOpts, mediaUrlsToSend[0], textForSend);
    } else if (textForSend) {
      await sendMetaText(metaOpts, textForSend);
    } else if (mediaUrlsToSend.length > 0) {
      await sendMetaImage(metaOpts, mediaUrlsToSend[0]);
    } else {
      await sendMetaText(metaOpts, '👍');
    }

    // Send additional media (max 1 extra)
    if (mediaUrlsToSend.length > 1) {
      await sendMetaImage(metaOpts, mediaUrlsToSend[1]);
    }

    await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: textForDB });
  } catch (err: any) {
    console.error('Sophia AI Error:', err);
    await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[BOT CRASH] OpenAI Error: ${err.message}` });
  }
}
