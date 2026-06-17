import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadId, eventName, value, currency, phone } = req.body;

  if (!leadId || !eventName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 1. Fetch Lead details (to get ctwa_clid, gclid, phone, store_id)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, stores(*, organizations(*))')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const store = lead.stores;
    const org = store?.organizations;

    if (!store) {
      return res.status(400).json({ error: 'Store not found for this lead' });
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const userPhone = phone || lead.phone;
    // Hash phone for CAPI (SHA256)
    const hashedPhone = userPhone ? crypto.createHash('sha256').update(userPhone.replace(/\D/g, '')).digest('hex') : undefined;

    const results: any = {};

    // --- FACEBOOK CAPI ---
    const fbPixel = store.meta_pixel_id || org?.meta_pixel_id;
    const fbToken = store.meta_capi_token || org?.meta_capi_token;

    if (fbPixel && fbToken) {
      const fbPayload = {
        data: [
          {
            event_name: eventName,
            event_time: eventTime,
            action_source: "business_messaging",
            messaging_channel: "whatsapp",
            user_data: {
              ph: hashedPhone ? [hashedPhone] : [],
              ctwa_clid: lead.ctwa_clid || undefined
            },
            custom_data: {
              value: value || 0,
              currency: currency || "COP"
            }
          }
        ]
      };

      try {
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/${fbPixel}/events?access_token=${fbToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbPayload)
        });
        results.facebook = await fbRes.json();
      } catch (e) {
        results.facebook = { error: 'Failed to send to FB CAPI' };
      }
    }

    // --- TIKTOK EVENTS API ---
    const ttPixel = store.tiktok_pixel_id || org?.tiktok_pixel_id;
    const ttToken = store.tiktok_access_token || org?.tiktok_access_token;

    if (ttPixel && ttToken) {
      const ttPayload = {
        pixel_code: ttPixel,
        event: eventName === 'Purchase' ? 'CompletePayment' : eventName,
        event_time: eventTime,
        context: {
          ad: { callback: lead.ctwa_clid }, // TikTok uses ttclid, but we map if available
          user: { phone_number: hashedPhone }
        },
        properties: {
          value: value || 0,
          currency: currency || "COP"
        }
      };

      try {
        const ttRes = await fetch(`https://business-api.tiktok.com/open_api/v1.3/pixel/track/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Access-Token': ttToken
          },
          body: JSON.stringify(ttPayload)
        });
        results.tiktok = await ttRes.json();
      } catch (e) {
        results.tiktok = { error: 'Failed to send to TikTok' };
      }
    }

    // --- GOOGLE ADS ENHANCED CONVERSIONS ---
    const googleId = store.google_conversion_id || org?.google_conversion_id;
    // For Google, you typically need to use the Google Ads API for Offline Conversions with gclid
    // This is a placeholder since the full Google Ads API requires OAuth/Developer Tokens
    if (googleId && lead.gclid) {
      results.google = { status: 'Pending Google Ads API Integration (Requires OAuth Developer Token)', gclid: lead.gclid };
    }

    return res.status(200).json({ success: true, results });

  } catch (err: any) {
    console.error('Tracking Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
