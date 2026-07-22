import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Vercel Pro limit

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * GET /api/cart-recovery
 * 
 * Cron endpoint — called by cron-job.org every 30 minutes.
 * Checks abandoned cart leads and sends WhatsApp recovery messages via Meta Cloud API.
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

  // Security: only authorized callers
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
  const hr25ago   = new Date(now.getTime() - 25 * 60 * 60 * 1000);

  let processed = 0;
  const log: string[] = [];

  try {
    // ── Load WhatsApp numbers (Meta credentials) and countries per store ──
    const { data: waNumbers } = await (supabase as any)
      .from('whatsapp_numbers')
      .select('store_id, phone_number_id, access_token, is_active, stores(country)');

    // Build store → Meta credentials map
    const storeMetaMap: Record<string, { phoneNumberId: string, accessToken: string, country: string }> = {};
    for (const wn of (waNumbers || [])) {
      if (wn.store_id && wn.phone_number_id && wn.access_token) {
        // Prefer active numbers, but use any if none active
        if (!storeMetaMap[wn.store_id] || wn.is_active) {
          const storeCountry = (wn.stores && Array.isArray(wn.stores) ? wn.stores[0]?.country : wn.stores?.country) || 'Colombia';
          storeMetaMap[wn.store_id] = {
            phoneNumberId: wn.phone_number_id,
            accessToken: wn.access_token,
            country: storeCountry
          };
        }
      }
    }

    // ── Helper: Check working hours ──
    function isWithinWorkingHours(country: string): boolean {
      const timezones: Record<string, string> = {
        'Colombia': 'America/Bogota',
        'Ecuador': 'America/Guayaquil',
        'Perú': 'America/Lima',
        'Venezuela': 'America/Caracas',
        'Costa Rica': 'America/Costa_Rica',
        'Guatemala': 'America/Guatemala',
        'Argentina': 'America/Argentina/Buenos_Aires',
        'Chile': 'America/Santiago',
        'México': 'America/Mexico_City'
      };
      const tz = timezones[country] || 'America/Bogota';
      try {
        const hourFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz });
        const currentHour = parseInt(hourFormatter.format(new Date()));
        return currentHour >= 8 && currentHour < 21; // 8:00 AM to 8:59 PM
      } catch (e) {
        return true; // Fallback just in case
      }
    }

    // Load recovery templates per store
    const { data: allTemplates } = await supabase
      .from('store_templates')
      .select('id, store_id, template_type, template_name, sent_count')
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

    // ── Helper: send a recovery WhatsApp template via Meta ──
    async function sendRecoveryMessage(lead: any, touch: number, storeId: string) {
      const template = getTemplate(storeId, touch);
      const metaCreds = storeMetaMap[storeId];

      if (!template?.template_name || !metaCreds) {
        log.push(`[T${touch}] SKIP lead ${lead.id} — no template or no Meta credentials for store ${storeId}`);
        return false;
      }

      // Build variables: {{1}}=name, {{2}}=product, {{3}}=price, {{4}}=address, {{5}}=city
      const contentVariables: Record<string, string> = {
        '1': lead.name?.split(' ')[0] || 'Amigo',
        '2': lead.product_name || 'tu pedido',
        '3': lead.total_price ? `$${Number(lead.total_price).toLocaleString('es-CO')}` : 'tu pedido',
        '4': lead.address || 'tu dirección',
        '5': `${lead.city || ''}`.trim() || 'tu ciudad',
        '6': lead.phone || ''
      };

      const filtered = Object.fromEntries(
        Object.entries(contentVariables).filter(([, v]) => v.trim() !== '')
      );

      try {
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
        
        await sendMetaTemplate({
          phoneNumberId: metaCreds.phoneNumberId,
          accessToken: metaCreds.accessToken,
          to: lead.phone
        }, template.template_name, 'es', components);

        // Log the message
        let bodyText = `[Bot Carrito T${touch}] Plantilla "${template.template_name}"`;
        await supabase.from('messages').insert({
          lead_id: lead.id,
          sender_type: 'human',
          content: bodyText,
          template_id: template.id
        });

        // Update sent count
        await supabase.from('store_templates').update({ sent_count: (template.sent_count || 0) + 1 }).eq('id', template.id);

        return true;
      } catch (e: any) {
        log.push(`[T${touch}] ERROR lead ${lead.id}: ${e.message}`);
        // Mark as undeliverable
        await supabase.from('leads').update({ 
          status: 'undeliverable',
          recovery_touch: -1
        }).eq('id', lead.id);
        log.push(`[T${touch}] 🚫 Lead ${lead.id} marcado como NO ENTREGABLE`);
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

      if (!storeMetaMap[lead.store_id]) {
        return res.status(400).json({ error: 'No WhatsApp number configured for this store' });
      }

      const nextTouch = Math.min((lead.recovery_touch || 0) + 1, 3);
      const sent = await sendRecoveryMessage(lead, nextTouch, lead.store_id);

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
      .gte('created_at', hr25ago.toISOString())
      .limit(2); // Anti-burst limit

    for (const lead of (t1Leads || [])) {
      const metaCreds = storeMetaMap[lead.store_id];
      if (!metaCreds) continue;
      
      // Enforce working hours
      if (!isWithinWorkingHours(metaCreds.country)) {
        log.push(`[T1] ⏰ Fuera de horario para ${lead.name} (${metaCreds.country})`);
        continue;
      }

      const sent = await sendRecoveryMessage(lead, 1, lead.store_id);
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
      .lte('recovery_last_sent_at', hr4ago.toISOString())
      .limit(2); // Anti-burst limit

    for (const lead of (t2Leads || [])) {
      const metaCreds = storeMetaMap[lead.store_id];
      if (!metaCreds) continue;
      
      if (!isWithinWorkingHours(metaCreds.country)) {
        log.push(`[T2] ⏰ Fuera de horario para ${lead.name} (${metaCreds.country})`);
        continue;
      }

      const sent = await sendRecoveryMessage(lead, 2, lead.store_id);
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
      .lte('recovery_last_sent_at', hr24ago.toISOString())
      .limit(2); // Anti-burst limit

    for (const lead of (t3Leads || [])) {
      const metaCreds = storeMetaMap[lead.store_id];
      if (!metaCreds) continue;
      
      if (!isWithinWorkingHours(metaCreds.country)) {
        log.push(`[T3] ⏰ Fuera de horario para ${lead.name} (${metaCreds.country})`);
        continue;
      }

      const sent = await sendRecoveryMessage(lead, 3, lead.store_id);
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
