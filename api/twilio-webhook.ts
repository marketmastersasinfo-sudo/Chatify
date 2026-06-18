import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

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

    const { From, To, Body, ProfileName, ButtonPayload, ButtonText } = bodyObj || {};

    if (!From || !To) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const customerPhone = From.replace('whatsapp:', '').replace('+', '');
    let storeTwilioPhone = To.replace('whatsapp:', '').trim();
    const storeTwilioPhoneNoPlus = storeTwilioPhone.replace('+', '');
    const storeTwilioPhoneWithPlus = storeTwilioPhone.startsWith('+') ? storeTwilioPhone : `+${storeTwilioPhone}`;

    // ── Find Store ──────────────────────────────────
    const { data: stores } = await supabase.from('stores').select('id, twilio_phone_number, organization_id');
    const store = stores?.find(s => {
      if (!s.twilio_phone_number) return false;
      const dbNum = s.twilio_phone_number.trim().replace('whatsapp:', '');
      return dbNum === storeTwilioPhone || dbNum === storeTwilioPhoneNoPlus || dbNum === storeTwilioPhoneWithPlus;
    });

    if (!store) {
      return res.status(200).json({ error: 'No store found', storeTwilioPhone });
    }

    // ── Find Lead ───────────────────────────────────
    const { data: lead } = await supabase
      .from('leads')
      .select('id, status, board_type, address, city, name, product_name, total_price, notes, document_id, email, recovery_touch')
      .eq('phone', customerPhone)
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let leadId = lead?.id;

    if (!lead) {
      // Create new lead for unknown inbound contacts
      const { data: newLead } = await supabase.from('leads').insert({
        store_id: store.id,
        name: ProfileName || 'Cliente WhatsApp',
        phone: customerPhone,
        status: 'cold_lead',
        board_type: 'sales_wa',
        traffic_source: 'whatsapp_direct',
        is_banned: false
      }).select().single();
      if (newLead) leadId = newLead.id;
    }

    if (!leadId) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // ── Save incoming message ───────────────────────
    const incomingText = ButtonText || ButtonPayload || Body || '';
    await supabase.from('messages').insert({
      lead_id: leadId,
      sender_type: 'client',
      content: incomingText
    });

    // ── DEBUG COMMAND: RESET ────────────────────────
    if (incomingText.trim().toUpperCase() === 'RESET') {
      await supabase.from('leads').update({ status: 'nuevo' }).eq('id', leadId);
      // Remove old street view messages so the flow can restart cleanly
      await supabase.from('messages').delete()
        .eq('lead_id', leadId)
        .ilike('content', '%Automated Street View Image Sent%');
      await supabase.from('messages').insert({
        lead_id: leadId,
        sender_type: 'ai',
        content: '[SISTEMA] Estado reseteado a "nuevo". Street View eliminado. Listo para nueva prueba.'
      });
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // ─────────────────────────────────────────────────
    // STATE MACHINE — 3 states for logistics leads
    // ─────────────────────────────────────────────────
    const leadStatus = lead?.status || 'cold_lead';
    const leadBoard = lead?.board_type || 'sales_wa';
    const isTwilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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
          const closeMsg = `¡Excelente, ${lead?.name?.split(' ')[0] || 'gracias'}! 🎉 Tu pedido está *confirmado* y pasó a despacho. En breve recibirás la información del envío. Si tienes dudas adicionales, ¡con gusto te ayudo!`;
          await isTwilioClient.messages.create({
            from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
            to: `whatsapp:+${customerPhone}`,
            body: closeMsg
          });
          await supabase.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: closeMsg });
        } else {
          // Client said the address is WRONG or asked something — let Sophia handle it
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
  const { data } = await supabase.from('products')
    .select('name, price, master_prompt')
    .eq('store_id', storeId)
    .ilike('name', `%${searchTerm}%`)
    .limit(1).maybeSingle();
  return data;
}

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

  // Get the full confirmation template message — it has the complete order: name, products, variants, price
  const variantInfo = await getTemplateMessageContext(leadId);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const aiMessages: any[] = [{ role: 'system', content: buildSophiaPrompt(lead || {}, productInfo, variantInfo) }];

  for (const msg of recentMessages) {
    if (msg.content.startsWith('[')) continue; // skip system/debug messages
    aiMessages.push({
      role: msg.sender_type === 'client' ? 'user' : 'assistant',
      content: msg.content
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: aiMessages,
      temperature: 0.65,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    const aiOutput = response.choices[0]?.message?.content?.trim() || '{}';
    let parsed: { reply: string, intent: string } = { reply: '', intent: 'None' };
    
    try {
      parsed = JSON.parse(aiOutput);
    } catch {
      // Fallback si la IA no devuelve JSON válido
      parsed.reply = aiOutput;
    }

    const aiReply = parsed.reply || '';
    if (!aiReply) return;

    // Disparar Tracking Semántico si se detectó una intención válida
    if (parsed.intent === 'AddToCart' || parsed.intent === 'InitiateCheckout') {
      const { firePixelEvent } = await import('./utils/_tracking.js');
      await firePixelEvent(sb, leadId, parsed.intent, lead?.total_price || 0, 'COP', customerPhone).catch(console.error);
    }

    // ══════════════════════════════════════════════════════
    // MOVER LEAD AUTOMÁTICAMENTE cuando Sophia confirma un pedido
    // Si la IA detecta intención de Purchase/confirmación,
    // mover el lead al tablero/estado correcto.
    // ══════════════════════════════════════════════════════
    if (parsed.intent === 'Purchase' || parsed.intent === 'OrderConfirmed') {
      const leadBoard = lead?.board_type || '';
      if (leadBoard.includes('remarketing')) {
        // Carrito recuperado → Mover a "Venta Recuperada"
        await sb.from('leads').update({ 
          status: 'recovered',
          recovery_confirmed_at: new Date().toISOString()
        }).eq('id', leadId);
      } else if (leadBoard === 'logistics') {
        // Logística → Mover a "Confirmado"
        await sb.from('leads').update({ status: 'confirmado' }).eq('id', leadId);
      }
      // Disparar evento Purchase al píxel
      const { firePixelEvent } = await import('./utils/_tracking.js');
      await firePixelEvent(sb, leadId, 'Purchase', lead?.total_price || 0, 'COP', customerPhone).catch(console.error);
    }

    const isTwilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await isTwilioClient.messages.create({
      from: `whatsapp:+${storeTwilioPhone.replace('+', '')}`,
      to: `whatsapp:+${customerPhone}`,
      body: aiReply
    });
    await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: aiReply });
  } catch (err: any) {
    console.error('Sophia AI Error:', err);
    await sb.from('messages').insert({ lead_id: leadId, sender_type: 'ai', content: `[BOT CRASH] OpenAI Error: ${err.message}` });
  }
}
