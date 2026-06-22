import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export const maxDuration = 60; // Aprovechando Vercel Pro (1 minuto de límite para la IA)

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

/** Detect if a message is a positive confirmation */
function isConfirmation(text: string): boolean {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const patterns = [
    /^(si|sí|yes|ok|okay|okey|dale|listo|acepto|confirmo|confirmar|correcto|exacto|afirmativo|claro|perfecto|de acuerdo|todo bien|esta bien|así es|eso es|correcto)$/i,
    /confirmo mi pedido/i,
    /confirmar pedido/i,
    /todo correcto/i,
    /datos correctos/i,
    /asi es/i,
    /^(bueno|genial|excelente|súper|super)$/i,
  ];
  return patterns.some(p => p.test(normalized));
}

/** Get the full body of the first ShopyEasy confirmation template sent to this customer.
 *  This message already has the complete order: name, product, variants, price, address.
 *  We pass it to Sophia as extra context so she can answer ANY question about the order.
 */
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

// ─────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    let bodyObj: any = req.body;
    if (Buffer.isBuffer(req.body)) {
      bodyObj = Object.fromEntries(new URLSearchParams(req.body.toString('utf8')).entries());
    } else if (typeof req.body === 'string') {
      bodyObj = Object.fromEntries(new URLSearchParams(req.body).entries());
    }

    const { From, To, Body, ProfileName, ButtonPayload, ButtonText, MediaUrl0, Latitude, ReferralHeadline, ReferralBody } = bodyObj || {};

    if (!From || !To) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const customerPhone = From.replace('whatsapp:', '').replace('+', '');
    let storeTwilioPhone = To.replace('whatsapp:', '').trim();
    const storeTwilioPhoneNoPlus = storeTwilioPhone.replace('+', '');
    const storeTwilioPhoneWithPlus = storeTwilioPhone.startsWith('+') ? storeTwilioPhone : `+${storeTwilioPhone}`;

    let incomingBody = ButtonText || ButtonPayload || Body || '';
    if (!incomingBody) {
      if (ReferralHeadline || ReferralBody) incomingBody = `[El cliente contactó desde un anuncio: ${ReferralHeadline || ''} ${ReferralBody || ''}]`.trim();
      else if (MediaUrl0) incomingBody = '[El cliente envió una foto, video o audio]';
      else if (Latitude) incomingBody = '[El cliente envió una ubicación]';
      else incomingBody = '[El cliente interactuó con el anuncio o envió un formato no soportado]';
    }

    // ── Find Store ──────────────────────────────────
    const { data: stores } = await supabase.from('stores').select('id, twilio_phone_number, organization_id, country');
    const store = stores?.find(s => {
      if (!s.twilio_phone_number) return false;
      const dbNum = s.twilio_phone_number.trim().replace('whatsapp:', '');
      return dbNum === storeTwilioPhone || dbNum === storeTwilioPhoneNoPlus || dbNum === storeTwilioPhoneWithPlus;
    });

    if (!store) {
      return res.status(200).json({ error: 'No store found', storeTwilioPhone });
    }

    // ── Find Lead ───────────────────────────────────
    let { data: lead } = await supabase
      .from('leads')
      .select('id, status, board_type, address, city, name, product_name, total_price, notes, document_id, email, recovery_touch, last_name, department, sector, postal_code')
      .eq('phone', customerPhone)
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let leadId = lead?.id;
    let isNewLead = false;

    if (!lead) {
      // Walink Smart Parser (Anti-Friction)
      const incomingBody = Body || '';
      let detectedProduct = null;
      let detectedSource = 'whatsapp_direct';
      
      const lowerText = incomingBody.toLowerCase();
      
      // 1. Detectar Fuente de Tráfico
      if (lowerText.includes('facebook') || lowerText.includes(' fb ') || lowerText.includes('meta')) {
        detectedSource = 'Facebook Ads';
      } else if (lowerText.includes('tiktok') || lowerText.includes('tik tok')) {
        detectedSource = 'TikTok Ads';
      } else if (lowerText.includes('instagram') || lowerText.includes(' ig ')) {
        detectedSource = 'Instagram Ads';
      }
      
      // 2. Detectar Nombre del Producto
      if (incomingBody.includes(':')) {
        const parts = incomingBody.split(':');
        if (parts.length > 1) {
          detectedProduct = parts[1].trim().replace(/[\.,!¡¿\?]+$/, '');
        }
      }

      // Create new lead for unknown inbound contacts
      const { data: newLead } = await supabase.from('leads').insert({
        store_id: store.id,
        name: ProfileName || 'Cliente WhatsApp',
        phone: customerPhone,
        product_name: detectedProduct,
        status: 'new',
        board_type: 'sales_wa',
        traffic_source: detectedSource,
        is_banned: false
      }).select().single();
      if (newLead) {
        lead = newLead;
        leadId = newLead.id;
        isNewLead = true;
      }
    }

    if (!leadId) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const incomingText = incomingBody;

    // ── Update Product Name if Ad Click ─────────────
    if (incomingText.includes('información sobre:')) {
      const parts = incomingText.split('información sobre:');
      if (parts.length > 1 && leadId) {
        const detectedProduct = parts[1].trim().replace(/[\.,!¡¿\?]+$/, '');
        await supabase.from('leads').update({ product_name: detectedProduct }).eq('id', leadId);
        if (lead) lead.product_name = detectedProduct;
      }
    }

    // ── Save incoming message ───────────────────────
    await supabase.from('messages').insert({
      lead_id: leadId,
      sender_type: 'client',
      content: incomingText
    });

    if (isNewLead) {
      // 🎯 Disparar evento "Lead" de forma ASÍNCRONA (NO BLOQUEANTE)
      // Esto evita que Vercel cancele la ejecución si el Fetch a FB/TikTok demora más de 10s.
      import('./utils/_tracking.js').then(({ firePixelEvent }) => {
        firePixelEvent(supabase, leadId!, 'Lead', 0, 'COP', customerPhone)
          .catch(e => console.error('Tracking Error async:', e));
      }).catch(e => console.error('Tracking Import Error:', e));
    }

    const isTwilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // ── DEBUG COMMAND: RESET ────────────────────────
    if (incomingText.trim().toUpperCase() === 'RESET') {
      await supabase.from('leads').update({ status: 'nuevo' }).eq('id', leadId);
      // Remove all old messages so the flow can restart cleanly
      await supabase.from('messages').delete().eq('lead_id', leadId);
      
      const resetMsg = '[SISTEMA] Memoria borrada. Empieza de cero mandando de nuevo tu primer mensaje.';
      await isTwilioClient.messages.create({
        from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
        to: `whatsapp:+${customerPhone}`,
        body: resetMsg
      });
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // ── DEBUG COMMAND: CHECK_DB ────────────────────────
    if (incomingText.trim().toUpperCase() === 'CHECK_DB') {
      const searchTerm = lead?.product_name ? lead.product_name.substring(0, 15) : '';
      const { data: prods, error } = await supabase.from('products').select('id, name, price, offers, media_assets, master_prompt').ilike('name', `%${searchTerm}%`);
      const debugMsg = `Buscando "${searchTerm}":\nERROR: ${error?.message || 'Ninguno'}\nDATA: ${JSON.stringify(prods, null, 2)}`;
      await isTwilioClient.messages.create({
        from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
        to: `whatsapp:+${customerPhone}`,
        body: debugMsg.substring(0, 1500)
      });
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // ── DEBUG COMMAND: CHECK_SCHEMA ────────────────────────
    if (incomingText.trim().toUpperCase() === 'CHECK_SCHEMA') {
      const searchTerm = lead?.product_name ? lead.product_name.substring(0, 15) : '';
      const { data, error } = await supabase.from('products').select('id, name, offers, media_assets').ilike('name', `%${searchTerm}%`).order('created_at', { ascending: false }).limit(1);
      const debugMsg = `SCHEMA ERROR: ${error?.message || 'Ninguno'}\nDATA: ${JSON.stringify(data, null, 2)}`;
      await isTwilioClient.messages.create({
        from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
        to: `whatsapp:+${customerPhone}`,
        body: debugMsg.substring(0, 1500)
      });
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // ─────────────────────────────────────────────────
    // STATE MACHINE — 3 states for logistics leads
    // ─────────────────────────────────────────────────
    const leadStatus = lead?.status || 'cold_lead';
    const leadBoard = lead?.board_type || 'sales_wa';

    if (leadBoard === 'logistics') {

      // ── STATE 1: 'nuevo' — Waiting for order confirmation ──
      // The template has been sent. We wait for "Confirmar pedido" button or a yes-phrase.
      if (leadStatus === 'nuevo') {
        const isOrderConfirmed = isConfirmation(incomingText) ||
          (ButtonPayload?.toLowerCase().includes('confirmar')) ||
          (ButtonText?.toLowerCase().includes('confirmar'));

        if (isOrderConfirmed) {
          // Track Conversion for A/B Testing
          try {
            const { data: lastMsg } = await supabase.from('messages')
              .select('id, template_id')
              .eq('lead_id', leadId)
              .not('template_id', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (lastMsg && lastMsg.template_id) {
              // Mark the message as converted with a timestamp
              await supabase.from('messages').update({ 
                is_conversion: true, 
                converted_at: new Date().toISOString() 
              }).eq('id', lastMsg.id);

              // Also update the global counter in store_templates (legacy / quick total)
              const { data: tmpl } = await supabase.from('store_templates').select('conversion_count').eq('id', lastMsg.template_id).single();
              if (tmpl) await supabase.from('store_templates').update({ conversion_count: (tmpl.conversion_count || 0) + 1 }).eq('id', lastMsg.template_id);
            }
          } catch (err) { console.error('Error tracking conversion', err); }

          // Move to next state IMMEDIATELY before anything else
          await supabase.from('leads').update({ status: 'address_confirming' }).eq('id', leadId);

          // Send Street View photo
          const { data: org } = await supabase.from('organizations').select('google_maps_api_key').eq('id', store.organization_id);
          const apiKey = (org as any)?.google_maps_api_key || 'AIzaSyD3amxq4t9GA892zO4C70nbnPGqnG4Ct-A';
          const leadAddress = lead?.address || '';
          const leadCity = lead?.city || '';

          if (leadAddress && leadCity) {
            const mapQuery = encodeURIComponent(`${leadAddress}, ${leadCity}`);
            const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${mapQuery}&key=${apiKey}`;

            try {
              await isTwilioClient.messages.create({
                from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
                to: `whatsapp:+${customerPhone}`,
                body: '¡Perfecto! 🏠 Para asegurar que la transportadora no se pierda, ¿esta es la fachada de tu dirección de entrega?',
                mediaUrl: [streetViewUrl]
              });
              await supabase.from('messages').insert({
                lead_id: leadId,
                sender_type: 'ai',
                content: `[Automated Street View Image Sent]\n¡Perfecto! 🏠 ¿Esta es la fachada de tu dirección de entrega?\n\nImage URL: ${streetViewUrl}`
              });
            } catch (e: any) {
              await supabase.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[BOT CRASH] Street View Error: ${e.message}` });
            }
          } else {
            // No address — ask Sophia to collect it
            await supabase.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: '[BOT SKIPPED STREET VIEW] No address/city on file — Sophia will ask.' });
            // Fall through to Sophia below
            await handleSophia({ lead, productInfo: null, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: supabase as any });
          }
        } else {
          // Client sent something else — let Sophia handle it (product questions, etc.)
          await supabase.from('leads').update({ status: 'sophia_handling' }).eq('id', leadId);
          const productInfo = await fetchProductInfo(lead, store.id);
          await handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: supabase as any });
        }
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // ── STATE 2: 'address_confirming' — Waiting for address/fachada confirmation ──
      if (leadStatus === 'address_confirming') {
        if (isConfirmation(incomingText)) {
          // ✅ All done — close conversation
          await supabase.from('leads').update({ status: 'confirmado' }).eq('id', leadId);
          try {
            const { firePixelEvent } = await import('./utils/_tracking.js');
            await firePixelEvent(supabase as any, leadId, 'Purchase', lead?.total_price || 0, 'COP', customerPhone);
          } catch (e) {
            console.error('Tracking Error on Purchase (address_confirming)', e);
          }
          const closeMsg = `¡Excelente, ${lead?.name?.split(' ')[0] || 'gracias'}! 🎉 Tu pedido está *confirmado* y pasó a despacho. En breve recibirás la información del envío. Si tienes dudas adicionales, ¡con gusto te ayudo!`;
          await isTwilioClient.messages.create({
            from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
            to: `whatsapp:+${customerPhone}`,
            body: closeMsg
          });
          await supabase.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: closeMsg });
        } else {
          // Client said the address is WRONG or asked something — let Sophia handle it
          await supabase.from('leads').update({ status: 'sophia_handling' }).eq('id', leadId);
          const productInfo = await fetchProductInfo(lead, store.id);
          await handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: supabase as any });
        }
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // ── STATE 3: 'confirmado' or other ── Sophia handles all follow-up questions ──
      const productInfo = await fetchProductInfo(lead, store.id);
      await handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: supabase as any });
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // ─────────────────────────────────────────────────
    // STATE MACHINE — Cart Recovery (remarketing_carts)
    // ─────────────────────────────────────────────────
    if (leadBoard === 'remarketing_carts') {

      // Detect rejection (button click or text saying NO)
      const isRejection =
        ButtonPayload?.toLowerCase().includes('perder') ||
        ButtonPayload?.toLowerCase().includes('no me interesa') ||
        ButtonPayload?.toLowerCase().includes('cancelar') ||
        ButtonText?.toLowerCase().includes('perder') ||
        ButtonText?.toLowerCase().includes('cancelar') ||
        /^(no( me interesa| quiero| gracias)?|nop|nel|cancelar?)$/i.test(incomingText.trim());

      if (isRejection && leadStatus !== 'verifying_address') {
        await supabase.from('leads').update({ status: 'lost' }).eq('id', leadId);
        const byeMsg = `Entendido \uD83D\uDE0A No hay problema. Si en algún momento cambias de opinión, aquí estaremos.\n\n¡Que tengas un excelente día! \uD83C\uDF1F`;
        await isTwilioClient.messages.create({
          from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
          to: `whatsapp:+${customerPhone}`,
          body: byeMsg
        });
        await supabase.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: byeMsg });
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // STATE: bot_sent / abandoned / client_replied — waiting for any interaction
      if (leadStatus === 'bot_sent' || leadStatus === 'abandoned' || leadStatus === 'client_replied') {
        if (leadStatus === 'bot_sent') {
          await supabase.from('leads').update({ status: 'client_replied' }).eq('id', leadId);
        }

        const isOrderConfirmed = isConfirmation(incomingText) ||
          ButtonPayload?.toLowerCase().includes('quiero') ||
          ButtonPayload?.toLowerCase().includes('confirmar') ||
          ButtonPayload?.toLowerCase().includes('reclamar') ||
          ButtonText?.toLowerCase().includes('quiero') ||
          ButtonText?.toLowerCase().includes('confirmar') ||
          ButtonText?.toLowerCase().includes('reclamar');

        if (isOrderConfirmed) {
          await supabase.from('leads').update({ status: 'verifying_address' }).eq('id', leadId);

          const { data: orgData } = await supabase.from('organizations').select('google_maps_api_key').eq('id', store.organization_id);
          const apiKey = (orgData as any)?.[0]?.google_maps_api_key || 'AIzaSyD3amxq4t9GA892zO4C70nbnPGqnG4Ct-A';
          const leadAddress = lead?.address || '';
          const leadCity = lead?.city || '';

          if (leadAddress && leadCity) {
            const mapQuery = encodeURIComponent(`${leadAddress}, ${leadCity}`);
            const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${mapQuery}&key=${apiKey}`;
            try {
              await isTwilioClient.messages.create({
                from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
                to: `whatsapp:+${customerPhone}`,
                body: '\u00a1Excelente! \uD83C\uDF89 Para asegurar una entrega perfecta, ¿esta es la fachada de tu dirección? \uD83C\uDFE0\uD83D\uDCCD',
                mediaUrl: [streetViewUrl]
              });
              await supabase.from('messages').insert({
                lead_id: leadId, sender_type: 'ai',
                content: `[Automated Street View] ¿Esta es la fachada correcta?\nImage: ${streetViewUrl}`
              });
            } catch (e: any) {
              await supabase.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[BOT CRASH] Street View Error: ${e.message}` });
            }
          } else {
            const productInfo = await fetchProductInfo(lead, store.id);
            await handleSophia({ lead, productInfo, leadId, incomingText: 'El cliente confirmó el pedido pero no tenemos su dirección completa. Pídele amablemente la dirección de entrega.', storeTwilioPhone, customerPhone, store, supabase: supabase as any });
          }
        } else {
          const productInfo = await fetchProductInfo(lead, store.id);
          await handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: supabase as any });
        }
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // STATE: verifying_address — waiting for fachada confirmation
      if (leadStatus === 'verifying_address') {
        if (isConfirmation(incomingText)) {
          await supabase.from('leads').update({
            status: 'recovered',
            recovery_confirmed_at: new Date().toISOString()
          }).eq('id', leadId);
          const firstName = lead?.name?.split(' ')[0] || 'amig@';
          const confirmMsg = `\u00a1Perfecto, ${firstName}! \u2705 Tu pedido de *${lead?.product_name || 'tu producto'}* está *100% confirmado*.\n\nEn breve recibirás la información del envío. \u00a1Gracias por tu compra! \uD83C\uDF81`;
          await isTwilioClient.messages.create({
            from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
            to: `whatsapp:+${customerPhone}`,
            body: confirmMsg
          });
          await supabase.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: confirmMsg });
        } else {
          const productInfo = await fetchProductInfo(lead, store.id);
          await handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: supabase as any });
        }
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // STATE: recovered — Sophia handles follow-up questions
      const productInfo2 = await fetchProductInfo(lead, store.id);
      await handleSophia({ lead, productInfo: productInfo2, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: supabase as any });
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // ── Non-logistics leads: always Sophia ─────────────
    if (process.env.OPENAI_API_KEY) {
      const productInfo = await fetchProductInfo(lead, store.id);
      await handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: supabase as any });
    }

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error: any) {
    console.error('Twilio Webhook Error:', error);
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

async function fetchProductInfo(lead: any, storeId: string): Promise<any> {
  if (!lead?.product_name) return null;
  const searchTerm = lead.product_name.substring(0, 15);
  const { data: product } = await supabase.from('products')
    .select('name, price, offers, media_assets, master_prompt, flow_template_id')
    .eq('store_id', storeId)
    .ilike('name', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle();
    
  if (product && product.flow_template_id) {
    const { data: template } = await supabase.from('flow_templates')
      .select('interactions')
      .eq('id', product.flow_template_id)
      .single();
    if (template) {
      product.flow_template = template.interactions;
    }
  }
  return product;
}

// Cache global para cobertura
let cachedCoverage: string | null = null;
let lastCoverageFetch = 0;

async function handleSophia({ lead, productInfo, leadId, incomingText, storeTwilioPhone, customerPhone, store, supabase: sb }: {
  lead: any; productInfo: any; leadId: string; incomingText: string;
  storeTwilioPhone: string; customerPhone: string; store: any; supabase: any;
}) {
  if (!process.env.OPENAI_API_KEY) return;

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

  const { buildSophiaPrompt } = await import('./utils/_sophia-prompt.js');
  const { OpenAI } = await import('openai');

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

  // Get the full confirmation template message — it has the complete order: name, products, variants, price
  const variantInfo = await getTemplateMessageContext(leadId);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const promptOpts = { storeCountry: store?.country || 'Colombia' };
  const aiMessages: any[] = [{ role: 'system', content: buildSophiaPrompt(lead || {}, productInfo, variantInfo, cachedCoverage || undefined, promptOpts) }];

  for (const msg of recentMessages) {
    if (msg.content.startsWith('[')) continue; // skip system/debug messages
    
    // Ocultar los links internos de la DB para que la IA no intente imitarlos y romper el JSON
    const cleanContent = msg.content.replace(/\[(IMG|VID|SND|DOC|GIF):.*?\]/g, '').trim();
    if (!cleanContent) continue;

    aiMessages.push({
      role: msg.sender_type === 'client' ? 'user' : 'assistant',
      content: cleanContent
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: aiMessages,
      temperature: 0.65,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const aiOutput = response.choices[0]?.message?.content?.trim() || '{}';
    let parsed: { reply: string, intent: string, extracted_city?: string, extracted_address?: string, extracted_last_name?: string, extracted_department?: string, extracted_sector?: string, extracted_postal_code?: string } = { reply: '', intent: 'None' };
    
    try {
      parsed = JSON.parse(aiOutput);
    } catch {
      // Fallback si la IA no devuelve JSON válido
      parsed.reply = aiOutput;
    }

    let aiReply = parsed.reply || '';
    if (!aiReply) return;

    // Disparar Tracking Semántico si se detectó una intención válida
    if (parsed.intent === 'AddToCart' || parsed.intent === 'InitiateCheckout') {
      const { firePixelEvent } = await import('./utils/_tracking.js');
      await firePixelEvent(sb, leadId, parsed.intent, lead?.total_price || 0, 'COP', customerPhone).catch(console.error);
    }

    // Guardar dirección si la IA la extrajo
    let newAddress = lead?.address || '';
    let newCity = lead?.city || '';
    let addressUpdated = false;

    if (parsed.extracted_address || parsed.extracted_city || parsed.extracted_last_name || parsed.extracted_department || parsed.extracted_sector || parsed.extracted_postal_code) {
      const updateData: any = {};
      // PERMITIR ACTUALIZAR DIRECCIÓN/CIUDAD AUNQUE YA EXISTAN, PERO IGNORAR CAMBIOS MINÚSCULOS DE FORMATO O MAYÚSCULAS
      const cleanOldAddr = (lead?.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanNewAddr = (parsed.extracted_address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (parsed.extracted_address && cleanOldAddr !== cleanNewAddr) { updateData.address = parsed.extracted_address; newAddress = parsed.extracted_address; addressUpdated = true; }
      
      const cleanOldCity = (lead?.city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanNewCity = (parsed.extracted_city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (parsed.extracted_city && cleanOldCity !== cleanNewCity) { updateData.city = parsed.extracted_city; newCity = parsed.extracted_city; addressUpdated = true; }
      
      if (parsed.extracted_last_name && !lead?.last_name) { updateData.last_name = parsed.extracted_last_name; addressUpdated = true; }
      if (parsed.extracted_department && !lead?.department) { updateData.department = parsed.extracted_department; addressUpdated = true; }
      if (parsed.extracted_sector && !lead?.sector) { updateData.sector = parsed.extracted_sector; addressUpdated = true; }
      if (parsed.extracted_postal_code && !lead?.postal_code) { updateData.postal_code = parsed.extracted_postal_code; addressUpdated = true; }
      
      if (addressUpdated) {
        // Si estábamos en verificación de fachada y el cliente cambió la dirección, lo devolvemos a negociando para forzar una nueva foto
        if (lead && (lead.status === 'verifying_address' || lead.status === 'closed' || lead.status === 'confirmado')) {
          updateData.status = 'negotiating';
          lead.status = 'negotiating';
        }
        await sb.from('leads').update(updateData).eq('id', leadId);
      }
    }

    const isTwilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // ══════════════════════════════════════════════════════
    // MOVER LEAD AUTOMÁTICAMENTE o INTERCEPTAR STREET VIEW
    // ══════════════════════════════════════════════════════
    const leadBoardType = lead?.board_type || '';

    // SEGURIDAD ANTI-ALUCINACIONES DE LA IA:
    // Si la IA dice que es "Purchase" pero faltan datos obligatorios, degradamos la intención.
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

    if (parsed.intent === 'Purchase' || parsed.intent === 'OrderConfirmed') {
      
      // INTERCEPTAR PARA STREET VIEW (Solo si tenemos dirección y ciudad y no estamos verificando ya)
      if (lead?.status !== 'verifying_address' && newAddress && newCity) {
        await sb.from('leads').update({ status: 'verifying_address' }).eq('id', leadId);
        const { data: orgData } = await sb.from('organizations').select('google_maps_api_key').eq('id', store.organization_id);
        const apiKey = (orgData as any)?.[0]?.google_maps_api_key || 'AIzaSyD3amxq4t9GA892zO4C70nbnPGqnG4Ct-A';
        const mapQuery = encodeURIComponent(`${newAddress}, ${newCity}`);
        const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${mapQuery}&key=${apiKey}`;
        
        aiReply = `¡Excelente! 🎉 Tengo toda la información. Para asegurar que la entrega de tu pedido sea perfecta, ¿esta es la fachada correcta de tu dirección? 🏠📍`;
        
        await isTwilioClient.messages.create({
          from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
          to: `whatsapp:+${customerPhone}`,
          body: aiReply,
          mediaUrl: [streetViewUrl]
        });
        await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[Automated Street View] ${aiReply}\nImage: ${streetViewUrl}` });
        return; // Detener flujo aquí, no cerrar el pedido aún
      }

      // CIERRE NORMAL DE PEDIDO (Si ya se verificó la dirección)
      if (lead?.status === 'verifying_address') {
        if (leadBoardType.includes('remarketing')) {
          await sb.from('leads').update({ status: 'recovered', recovery_confirmed_at: new Date().toISOString() }).eq('id', leadId);
        } else if (leadBoardType === 'logistics') {
          await sb.from('leads').update({ status: 'confirmado' }).eq('id', leadId);
          try {
            const { firePixelEvent } = await import('./utils/_tracking.js');
            await firePixelEvent(sb as any, leadId, 'Purchase', lead?.total_price || 0, 'COP', customerPhone);
          } catch (e) {
            console.error('Tracking Error on Purchase (Sophia)', e);
          }
        } else if (leadBoardType === 'sales_wa') {
          await sb.from('leads').update({ status: 'closed' }).eq('id', leadId);
        }
        const { firePixelEvent } = await import('./utils/_tracking.js');
        await firePixelEvent(sb, leadId, 'Purchase', lead?.total_price || 0, 'COP', customerPhone).catch(console.error);
      }
    }

    // ══════════════════════════════════════════════════════
    // EXTRACCIÓN DE MULTIMEDIA (Imágenes / Audios / Videos / Docs)
    // ══════════════════════════════════════════════════════
    const mediaUrlsToSend: string[] = [];
    let textForDB = aiReply;
    let textForTwilio = aiReply;

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

          // Reemplazar globalmente para la DB
          textForDB = textForDB.split(asset.tag).join(`[${dbPrefix}:${asset.url}]`);
          // Limpiar para el texto de Twilio (ya que se va a enviar como mediaUrl aparte)
          textForTwilio = textForTwilio.split(asset.tag).join('');
        }
      }
    }

    // Limpieza preventiva por si la IA alucinó tags viejos o no existentes
    textForTwilio = textForTwilio.replace(/\[(MEDIA|AUDIO|VIDEO|FILE|GIF)_\d+\]/g, '').trim();
    textForDB = textForDB.trim();

    const msgPayload: any = {
      from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
      to: `whatsapp:+${customerPhone}`
    };
    if (textForTwilio) msgPayload.body = textForTwilio;
    if (mediaUrlsToSend.length > 0) msgPayload.mediaUrl = [mediaUrlsToSend[0]]; // WhatsApp only supports 1 media per message

    // Twilio fallback if both are empty
    if (!msgPayload.body && !msgPayload.mediaUrl) {
      msgPayload.body = '👍';
    }

    await isTwilioClient.messages.create(msgPayload);

    // Enviar el resto de archivos multimedia como mensajes separados (Limitación estricta de la API de WhatsApp de Twilio)
    for (let i = 1; i < mediaUrlsToSend.length; i++) {
      await isTwilioClient.messages.create({
        from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
        to: `whatsapp:+${customerPhone}`,
        mediaUrl: [mediaUrlsToSend[i]]
      });
    }

    await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: textForDB });
  } catch (err: any) {
    console.error('Sophia AI Error:', err);
    await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[BOT CRASH] OpenAI Error: ${err.message}` });
  }
}
