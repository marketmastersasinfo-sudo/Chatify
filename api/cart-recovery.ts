import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export const maxDuration = 60; // Vercel Pro limit

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * GET /api/cart-recovery
 * 
 * Cron endpoint — called by cron-job.org every 30 minutes (FREE, no Vercel Pro needed).
 * Checks abandoned cart leads and sends WhatsApp recovery messages via Twilio.
 * 
 * Sequence:
 *   Touch 1 → 30 minutes after abandonment
 *   Touch 2 → 4 hours after Touch 1 (if no reply)
 *   Touch 3 → 24 hours after Touch 2 (if no reply)
 *   Expire  → 48 hours after Touch 3 → status = 'lost' (Base Remarketing)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {

  // ==========================================
  // POST: Create a test lead for cart recovery
  // ==========================================
  if (req.method === 'POST') {
    try {
      const { storeId, name, phone, productName, totalPrice } = req.body;
      if (!storeId || !name || !phone) {
        return res.status(400).json({ error: 'Faltan campos: storeId, name, phone' });
      }

      // Clean phone number
      let cleanPhone = phone.replace(/[^\d+]/g, '');
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.length === 10) cleanPhone = `57${cleanPhone}`;

      const { data: newLead, error } = await supabase.from('leads').insert({
        store_id: storeId,
        name,
        phone: cleanPhone,
        product_name: productName || 'Producto de prueba',
        total_price: totalPrice || 50000,
        board_type: 'remarketing_carts',
        status: 'abandoned',
        recovery_touch: 0,
        traffic_source: 'Test Manual',
        notes: 'Lead de prueba creado manualmente para testing'
      }).select().single();

      if (error) throw error;
      return res.status(200).json({ success: true, lead: newLead });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Security: only authorized callers (cron-job.org with secret header) — skip for force-send
  const forceSendLeadId = req.query.leadId as string | undefined;
  const secret = req.headers['x-cron-secret'];
  if (!forceSendLeadId && process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const min30ago  = new Date(now.getTime() - 30 * 60 * 1000);
  const hr4ago    = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const hr24ago   = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hr48ago   = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const hr25ago   = new Date(now.getTime() - 25 * 60 * 60 * 1000); // safety window

  let processed = 0;
  const log: string[] = [];

  try {
    // ── Load stores with their Twilio numbers and template SIDs ──────────────
    const { data: stores } = await supabase
      .from('stores')
      .select('id, twilio_phone_number, organization_id, meta_access_token, meta_phone_number_id');

    // Load recovery templates per store (or global fallback)
    const { data: allTemplates } = await supabase
      .from('store_templates')
      .select('id, store_id, template_type, twilio_content_sid, sent_count, template_name')
      .in('template_type', ['recuperar_carrito_t1', 'recuperar_carrito_t2', 'recuperar_carrito_t3', 'abandoned_cart'])
      .eq('is_active', true);

    const getTemplate = (storeId: string, touch: number) => {
      const type = `recuperar_carrito_t${touch}`;
      const matches = allTemplates?.filter(t => t.store_id === storeId && (t.template_type === type || t.template_type === 'abandoned_cart')) || [];
      if (matches.length > 0) {
        return matches[Math.floor(Math.random() * matches.length)];
      }
      return null;
    };

    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // ── Helper: send a recovery WhatsApp template ─────────────────────────────
    async function sendRecoveryMessage(lead: any, touch: number, store: any) {
      const useMetaApi = !!(store.meta_access_token && store.meta_phone_number_id);

      if (!template?.twilio_content_sid && !useMetaApi) {
        log.push(`[T${touch}] SKIP lead ${lead.id} — no template configured for store ${store.id}`);
        return false;
      }

      const fromNumber = store.twilio_phone_number?.startsWith('whatsapp:')
        ? store.twilio_phone_number
        : `whatsapp:+${store.twilio_phone_number?.replace('+', '')}`;

      const toNumber = `whatsapp:+${lead.phone}`;

      // Build variables for Meta: {{1}}=name, {{2}}=product, {{3}}=price, {{4}}=address, {{5}}=city, {{6}}=phone
      const contentVariables: Record<string, string> = {
        '1': lead.name?.split(' ')[0] || 'Amigo',
        '2': lead.product_name || 'tu pedido',
        '3': lead.total_price ? `$${Number(lead.total_price).toLocaleString('es-CO')}` : 'tu pedido',
        '4': lead.address || 'tu dirección',
        '5': `${lead.city || ''}`.trim() || 'tu ciudad',
        '6': lead.phone || ''
      };

      // Filter empty variables
      const filtered = Object.fromEntries(
        Object.entries(contentVariables).filter(([, v]) => v.trim() !== '')
      );

      try {
        if (useMetaApi) {
          const { sendMetaTemplate } = await import('./utils/_meta-whatsapp.js');
          const components = [];
          if (Object.keys(filtered).length > 0) {
            const parameters = Object.keys(filtered).map(k => ({
              type: 'text',
              text: filtered[k]
            }));
            components.push({
              type: 'body',
              parameters
            });
          }
          
          const tplName = template?.template_name || `recuperar_carrito_t${touch}`;
          await sendMetaTemplate({
            phoneNumberId: store.meta_phone_number_id,
            accessToken: store.meta_access_token,
            to: lead.phone
          }, tplName, 'es', components);
          
        } else {
          await twilioClient.messages.create({
            from: fromNumber,
            to: toNumber,
            contentSid: template.twilio_content_sid,
            contentVariables: JSON.stringify(filtered),
          } as any);
        }

        // Fetch actual template body to log the real message content
        let bodyText = `[Bot Carrito T${touch}] Plantilla "${template.template_name}"`;
        try {
          if (!useMetaApi) {
            const content = await twilioClient.content.v1.contents(template.twilio_content_sid).fetch();
            const types = content.types as any;
            const rawBody = types['twilio/text']?.body || types['twilio/media']?.body || types['twilio/quick-reply']?.body || '';
            if (rawBody) {
              bodyText = rawBody;
              // Replace variables with actual values
              for (const [key, val] of Object.entries(filtered)) {
                bodyText = bodyText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
              }
              // Extraer botones interactivos
              const buttons: string[] = [];
              const extractActions = (actions: any[]) => {
                if (!actions || !Array.isArray(actions)) return;
                for (const action of actions) {
                  buttons.push(action.title || action.body || action.url || action.id || JSON.stringify(action));
                }
              };
              if (types['twilio/quick-reply']?.actions) extractActions(types['twilio/quick-reply'].actions);
              if (types['twilio/call-to-action']?.actions) extractActions(types['twilio/call-to-action'].actions);
              if (types['whatsapp/card']?.actions) extractActions(types['whatsapp/card'].actions);
              if (buttons.length === 0) {
                for (const typeKey of Object.keys(types)) {
                  if (types[typeKey]?.actions) extractActions(types[typeKey].actions);
                }
              }
              if (buttons.length > 0) {
                bodyText += '\n\n' + buttons.map(b => `[BOTÓN] ${b}`).join('\n');
              }
            }
          }
        } catch { /* ignore - use fallback text */ }

        // Log in messages table with the actual message content
        await supabase.from('messages').insert({
          lead_id: lead.id,
          sender_type: 'human',
          content: bodyText,
          template_id: template.id
        });

        // Update sent count for analytics
        await supabase.from('store_templates').update({ sent_count: (template.sent_count || 0) + 1 }).eq('id', template.id);

        return true;
      } catch (e: any) {
        log.push(`[T${touch}] ERROR lead ${lead.id}: ${e.message}`);
        // 🛑 OPTIMIZACIÓN: Marcar como no entregable para que NUNCA se reintente
        // Twilio cobra aunque el mensaje falle, así que evitamos reintentos inútiles
        await supabase.from('leads').update({ 
          status: 'undeliverable',
          recovery_touch: -1 // -1 = marcado como fallido permanente
        }).eq('id', lead.id);
        log.push(`[T${touch}] 🚫 Lead ${lead.id} marcado como NO ENTREGABLE (no se reintentará)`);
        return false;
      }
    }

    // ═══════════════════════════════════════
    // FORCE SEND — Manual trigger for a single lead
    // ═══════════════════════════════════════
    if (forceSendLeadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, phone, product_name, total_price, address, city, store_id, recovery_touch, status')
        .eq('id', forceSendLeadId)
        .single();

      if (!lead) return res.status(404).json({ error: 'Lead not found' });

      const store = stores?.find(s => s.id === lead.store_id);
      if (!store?.twilio_phone_number) {
        return res.status(400).json({ error: 'Store has no Twilio phone number' });
      }

      // Send NEXT touch (current + 1, max 3)
      const nextTouch = Math.min((lead.recovery_touch || 0) + 1, 3);
      const sent = await sendRecoveryMessage(lead, nextTouch, store);

      if (sent) {
        await supabase.from('leads').update({
          status: 'bot_sent',
          recovery_touch: nextTouch,
          recovery_last_sent_at: now.toISOString()
        }).eq('id', lead.id);

        return res.status(200).json({
          success: true,
          message: `Touch ${nextTouch} sent to ${lead.name}`,
          log: [`[FORCE T${nextTouch}] ✅ ${lead.name} (${lead.phone})`]
        });
      } else {
        return res.status(400).json({ error: 'Failed to send', log });
      }
    }

    // ═══════════════════════════════════════
    // TOQUE 1 — 30 minutos tras abandono
    // ═══════════════════════════════════════
    const { data: t1Leads } = await supabase
      .from('leads')
      .select('id, name, phone, product_name, total_price, address, city, store_id')
      .eq('board_type', 'remarketing_carts')
      .eq('status', 'abandoned')
      .eq('recovery_touch', 0)
      .lte('created_at', min30ago.toISOString())
      .gte('created_at', hr25ago.toISOString()); // safety window

    for (const lead of (t1Leads || [])) {
      const store = stores?.find(s => s.id === lead.store_id);
      if (!store) continue;

      const sent = await sendRecoveryMessage(lead, 1, store);
      if (sent) {
        await supabase.from('leads').update({
          status: 'bot_sent',
          recovery_touch: 1,
          recovery_last_sent_at: now.toISOString()
        }).eq('id', lead.id);
        log.push(`[T1] ✅ ${lead.name} (${lead.phone})`);
        processed++;
      }
    }

    // ═══════════════════════════════════════
    // TOQUE 2 — 4 horas sin respuesta
    // ═══════════════════════════════════════
    const { data: t2Leads } = await supabase
      .from('leads')
      .select('id, name, phone, product_name, total_price, store_id')
      .eq('board_type', 'remarketing_carts')
      .eq('status', 'bot_sent')
      .eq('recovery_touch', 1)
      .lte('recovery_last_sent_at', hr4ago.toISOString());

    for (const lead of (t2Leads || [])) {
      const store = stores?.find(s => s.id === lead.store_id);
      if (!store) continue;

      const sent = await sendRecoveryMessage(lead, 2, store);
      if (sent) {
        await supabase.from('leads').update({
          recovery_touch: 2,
          recovery_last_sent_at: now.toISOString()
        }).eq('id', lead.id);
        log.push(`[T2] ✅ ${lead.name} (${lead.phone})`);
        processed++;
      }
    }

    // ═══════════════════════════════════════
    // TOQUE 3 — 24 horas sin respuesta
    // ═══════════════════════════════════════
    const { data: t3Leads } = await supabase
      .from('leads')
      .select('id, name, phone, product_name, total_price, store_id')
      .eq('board_type', 'remarketing_carts')
      .eq('status', 'bot_sent')
      .eq('recovery_touch', 2)
      .lte('recovery_last_sent_at', hr24ago.toISOString());

    for (const lead of (t3Leads || [])) {
      const store = stores?.find(s => s.id === lead.store_id);
      if (!store) continue;

      const sent = await sendRecoveryMessage(lead, 3, store);
      if (sent) {
        await supabase.from('leads').update({
          recovery_touch: 3,
          recovery_last_sent_at: now.toISOString()
        }).eq('id', lead.id);
        log.push(`[T3] ✅ ${lead.name} (${lead.phone})`);
        processed++;
      }
    }

    // ═══════════════════════════════════════
    // EXPIRAR — 48h tras Toque 3 sin respuesta → Base Remarketing
    // ═══════════════════════════════════════
    const { data: expiredLeads } = await supabase
      .from('leads')
      .select('id, name')
      .eq('board_type', 'remarketing_carts')
      .eq('status', 'bot_sent')
      .eq('recovery_touch', 3)
      .lte('recovery_last_sent_at', hr48ago.toISOString());

    for (const lead of (expiredLeads || [])) {
      await supabase.from('leads').update({ status: 'lost' }).eq('id', lead.id);
      log.push(`[EXPIRED] → Base Remarketing: ${lead.name}`);
    }

    return res.status(200).json({
      success: true,
      processed,
      expired: expiredLeads?.length || 0,
      log
    });

  } catch (error: any) {
    console.error('[cart-recovery] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
