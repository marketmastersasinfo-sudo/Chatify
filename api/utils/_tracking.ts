import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function firePixelEvent(
  supabase: any,
  leadId: string, 
  eventName: string, 
  value?: number, 
  currency: string = "COP", 
  phoneFallback?: string
) {
  try {
    // 1. Fetch Lead details (to get ctwa_clid, gclid, phone, store_id)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, stores(*, organizations(*))')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Tracking Error: Lead not found', leadId);
      return { success: false, error: 'Lead not found' };
    }

    const store = lead.stores;
    const org = store?.organizations;

    if (!store) {
      console.error('Tracking Error: Store not found for lead', leadId);
      return { success: false, error: 'Store not found for this lead' };
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const userPhone = phoneFallback || lead.phone;
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
              value: value || lead.total_price || 0,
              currency: currency
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
      } catch (e: any) {
        results.facebook = { error: 'Failed to send to FB CAPI', details: e.message };
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
          ad: { callback: lead.ctwa_clid }, // TikTok uses ttclid, mapping if available
          user: { phone_number: hashedPhone }
        },
        properties: {
          value: value || lead.total_price || 0,
          currency: currency
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
      } catch (e: any) {
        results.tiktok = { error: 'Failed to send to TikTok', details: e.message };
      }
    }

    // --- GOOGLE ADS ENHANCED CONVERSIONS (GA4 MEASUREMENT PROTOCOL) ---
    // If they have GA4 Measurement ID & API Secret configured
    const ga4Id = store.ga4_measurement_id || org?.ga4_measurement_id;
    const ga4Secret = store.ga4_api_secret || org?.ga4_api_secret;
    
    if (ga4Id && ga4Secret) {
      // Create a predictable client_id based on phone number hash
      const clientId = hashedPhone || crypto.randomUUID();
      const ga4Payload = {
        client_id: clientId,
        events: [{
          name: eventName === 'Lead' || eventName === 'SubmitForm' ? 'generate_lead' : 
                eventName === 'Purchase' ? 'purchase' : 
                eventName.toLowerCase(),
          params: {
            value: value || lead.total_price || 0,
            currency: currency,
            session_id: '123'
          }
        }]
      };
      
      try {
        const ga4Res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${ga4Id}&api_secret=${ga4Secret}`, {
          method: 'POST',
          body: JSON.stringify(ga4Payload)
        });
        results.google = { status: ga4Res.ok ? 'Sent' : 'Error', code: ga4Res.status };
      } catch (e: any) {
        results.google = { error: 'Failed to send to GA4', details: e.message };
      }
    }

    return { success: true, results };

  } catch (err: any) {
    console.error('Tracking Helper Error:', err);
    return { success: false, error: err.message };
  }
}
