import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const section = (req.query.section as string) || 'all';
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const report: any = { errors: [] };

  // ══════ SECCIÓN: TEMPLATES ══════
  if (section === 'all' || section === 'templates') {
    report.templates = [];
    try {
      const contents = await twilioClient.content.v1.contents.list({ limit: 50 });
      for (const c of contents) {
        const types = c.types as any;
        const templateInfo: any = {
          sid: c.sid, friendlyName: c.friendlyName, language: c.language,
          dateCreated: c.dateCreated, body: null, buttons: [], hasButtons: false, templateType: 'unknown'
        };
        if (types['twilio/quick-reply']) {
          templateInfo.templateType = 'quick-reply';
          templateInfo.body = types['twilio/quick-reply'].body || '';
          templateInfo.buttons = (types['twilio/quick-reply'].actions || []).map((a: any) => a.title || a.body || '');
          templateInfo.hasButtons = templateInfo.buttons.length > 0;
        } else if (types['twilio/call-to-action']) {
          templateInfo.templateType = 'call-to-action';
          templateInfo.body = types['twilio/call-to-action'].body || '';
          templateInfo.buttons = (types['twilio/call-to-action'].actions || []).map((a: any) => ({ title: a.title, type: a.type, url: a.url }));
          templateInfo.hasButtons = templateInfo.buttons.length > 0;
        } else if (types['twilio/text']) {
          templateInfo.templateType = 'text-only';
          templateInfo.body = types['twilio/text'].body || '';
        } else if (types['twilio/media']) {
          templateInfo.templateType = 'media';
          templateInfo.body = types['twilio/media'].body || '';
        }
        templateInfo.variables = c.variables || {};
        report.templates.push(templateInfo);
      }
    } catch (e: any) { report.errors.push({ section: 'templates', error: e.message }); }
  }

  // ══════ SECCIÓN: MENSAJES RECIENTES ══════
  if (section === 'all' || section === 'messages') {
    report.recentMessages = [];
    try {
      const messages = await twilioClient.messages.list({ limit: 15 });
      for (const m of messages) {
        report.recentMessages.push({
          direction: m.direction, to: m.to, from: m.from, status: m.status,
          errorCode: m.errorCode, errorMessage: m.errorMessage,
          dateSent: m.dateSent || m.dateCreated,
          bodyPreview: (m.body || '').substring(0, 100) + '...'
        });
      }
    } catch (e: any) { report.errors.push({ section: 'messages', error: e.message }); }
  }

  // ══════ SECCIÓN: PÍXELES (Meta, TikTok, GA4) ══════
  if (section === 'all' || section === 'pixels') {
    report.pixels = { config: {}, testResult: null, summary: {} };
    try {
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name, meta_pixel_id, meta_capi_token, tiktok_pixel_id, tiktok_access_token, ga4_measurement_id, ga4_api_secret, organization_id, organizations(meta_pixel_id, meta_capi_token, tiktok_pixel_id, tiktok_access_token, ga4_measurement_id, ga4_api_secret)');

      for (const s of (stores || [])) {
        const org = (s as any).organizations;
        report.pixels.config[s.name || s.id] = {
          meta_pixel: s.meta_pixel_id || org?.meta_pixel_id || '❌ NO CONFIGURADO',
          meta_token: (s.meta_capi_token || org?.meta_capi_token) ? '✅ Tiene token' : '❌ NO CONFIGURADO',
          tiktok_pixel: s.tiktok_pixel_id || org?.tiktok_pixel_id || '❌ NO CONFIGURADO',
          tiktok_token: (s.tiktok_access_token || org?.tiktok_access_token) ? '✅ Tiene token' : '❌ NO CONFIGURADO',
          ga4_id: s.ga4_measurement_id || org?.ga4_measurement_id || '❌ NO CONFIGURADO',
          ga4_secret: (s.ga4_api_secret || org?.ga4_api_secret) ? '✅ Tiene secret' : '❌ NO CONFIGURADO'
        };
      }

      // Test event: usar el último lead
      const { data: testLead } = await supabase
        .from('leads').select('id, name, phone, store_id, stores(*, organizations(*))').order('created_at', { ascending: false }).limit(1).single();

      if (testLead) {
        const store = (testLead as any).stores;
        const org = store?.organizations;
        const phone = testLead.phone;
        const hashedPhone = phone ? crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex') : undefined;
        const eventTime = Math.floor(Date.now() / 1000);

        report.pixels.testLead = { id: testLead.id, name: testLead.name, phone: testLead.phone };

        // Meta CAPI Test
        const fbPixel = store?.meta_pixel_id || org?.meta_pixel_id;
        const fbToken = store?.meta_capi_token || org?.meta_capi_token;
        if (fbPixel && fbToken) {
          try {
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${fbPixel}/events?access_token=${fbToken}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: [{ event_name: 'Lead', event_time: eventTime, action_source: 'business_messaging', messaging_channel: 'whatsapp', user_data: { ph: hashedPhone ? [hashedPhone] : [] }, custom_data: { value: 1, currency: 'COP' } }] })
            });
            const fbJson = await fbRes.json();
            report.pixels.summary.facebook = fbJson.events_received ? `✅ FUNCIONA (${fbJson.events_received} eventos)` : `❌ ERROR: ${JSON.stringify(fbJson)}`;
            report.pixels.testResult = { ...report.pixels.testResult, facebook: fbJson };
          } catch (e: any) { report.pixels.summary.facebook = `❌ ${e.message}`; }
        } else { report.pixels.summary.facebook = '⚠️ No configurado'; }

        // TikTok Test
        const ttPixel = store?.tiktok_pixel_id || org?.tiktok_pixel_id;
        const ttToken = store?.tiktok_access_token || org?.tiktok_access_token;
        if (ttPixel && ttToken) {
          try {
            const ttRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/pixel/track/', {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Access-Token': ttToken },
              body: JSON.stringify({ pixel_code: ttPixel, event: 'Lead', event_time: eventTime, context: { user: { phone_number: hashedPhone } }, properties: { value: 1, currency: 'COP' } })
            });
            const ttJson = await ttRes.json();
            report.pixels.summary.tiktok = ttJson.code === 0 ? '✅ FUNCIONA' : `❌ ERROR: ${JSON.stringify(ttJson)}`;
            report.pixels.testResult = { ...report.pixels.testResult, tiktok: ttJson };
          } catch (e: any) { report.pixels.summary.tiktok = `❌ ${e.message}`; }
        } else { report.pixels.summary.tiktok = '⚠️ No configurado'; }

        // GA4 Test
        const ga4Id = store?.ga4_measurement_id || org?.ga4_measurement_id;
        const ga4Secret = store?.ga4_api_secret || org?.ga4_api_secret;
        if (ga4Id && ga4Secret) {
          try {
            const ga4Res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${ga4Id}&api_secret=${ga4Secret}`, {
              method: 'POST', body: JSON.stringify({ client_id: hashedPhone || crypto.randomUUID(), events: [{ name: 'generate_lead', params: { value: 1, currency: 'COP' } }] })
            });
            report.pixels.summary.google = ga4Res.ok ? '✅ FUNCIONA' : `❌ Status ${ga4Res.status}`;
            report.pixels.testResult = { ...report.pixels.testResult, google: { status: ga4Res.status, ok: ga4Res.ok } };
          } catch (e: any) { report.pixels.summary.google = `❌ ${e.message}`; }
        } else { report.pixels.summary.google = '⚠️ No configurado'; }
      }
    } catch (e: any) { report.errors.push({ section: 'pixels', error: e.message }); }
  }

  return res.status(200).json(report);
}
