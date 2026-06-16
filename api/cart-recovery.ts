import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Security: only authorized callers (cron-job.org with secret header)
  const secret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
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
      .select('id, twilio_phone_number, organization_id');

    // Load recovery templates per store (or global fallback)
    const { data: allTemplates } = await supabase
      .from('store_templates')
      .select('store_id, template_name, twilio_content_sid')
      .in('template_name', ['recuperar_carrito_t1', 'recuperar_carrito_t2', 'recuperar_carrito_t3',
                             'recuperar_carritos_abandonados']); // legacy name fallback

    const getTemplate = (storeId: string, touch: number) => {
      const names = {
        1: ['recuperar_carrito_t1', 'recuperar_carritos_abandonados'],
        2: ['recuperar_carrito_t2', 'recuperar_carritos_abandonados'],
        3: ['recuperar_carrito_t3', 'recuperar_carritos_abandonados'],
      }[touch] || [];
      for (const name of names) {
        const t = allTemplates?.find(t => t.store_id === storeId && t.template_name === name);
        if (t) return t;
      }
      return null;
    };

    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // ── Helper: send a recovery WhatsApp template ─────────────────────────────
    async function sendRecoveryMessage(lead: any, touch: number, store: any) {
      const template = getTemplate(store.id, touch);
      if (!template?.twilio_content_sid) {
        log.push(`[T${touch}] SKIP lead ${lead.id} — no template configured for store ${store.id}`);
        return false;
      }

      const fromNumber = store.twilio_phone_number?.startsWith('whatsapp:')
        ? store.twilio_phone_number
        : `whatsapp:+${store.twilio_phone_number?.replace('+', '')}`;

      const toNumber = `whatsapp:+${lead.phone}`;

      // Build variables: {{1}}=name, {{2}}=product, {{3}}=price (T3 only)
      const contentVariables: Record<string, string> = {
        '1': lead.name?.split(' ')[0] || 'Amigo',
        '2': lead.product_name || 'tu producto',
      };
      if (touch === 3 && lead.total_price) {
        contentVariables['3'] = `$${Number(lead.total_price).toLocaleString('es-CO')}`;
      }

      // Filter empty variables
      const filtered = Object.fromEntries(
        Object.entries(contentVariables).filter(([, v]) => v.trim() !== '')
      );

      try {
        await twilioClient.messages.create({
          from: fromNumber,
          to: toNumber,
          contentSid: template.twilio_content_sid,
          contentVariables: JSON.stringify(filtered),
        } as any);

        // Log in messages table
        await supabase.from('messages').insert({
          lead_id: lead.id,
          sender_type: 'human',
          content: `[Bot Carrito T${touch}] Plantilla "${template.template_name}" enviada automáticamente.`
        });

        return true;
      } catch (e: any) {
        log.push(`[T${touch}] ERROR lead ${lead.id}: ${e.message}`);
        return false;
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
