import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function firePixelEvent(
  supabase: any,
  leadId: string, 
  eventName: string, 
  value?: number, 
  currency: string = "COP", 
  phoneFallback?: string,
  testEventCode?: string,
  overrides?: any
) {
  try {
    let lead: any = null;
    let store: any = null;
    let org: any = null;

    if (leadId === 'TEST') {
      // Test mode bypasses DB
      org = { 
        meta_pixel_id: overrides?.metaPixelId,
        meta_capi_token: overrides?.metaCapiToken,
        tiktok_pixel_id: overrides?.tiktokPixelId,
        tiktok_access_token: overrides?.tiktokAccessToken,
        ga4_measurement_id: overrides?.ga4MeasurementId,
        ga4_api_secret: overrides?.ga4ApiSecret
      };
      lead = { phone: '573000000000', total_price: 1000 };
    } else {
      // 1. Fetch Lead details
      const { data, error: leadError } = await supabase
        .from('leads')
        .select('*, stores(*, organizations(*))')
        .eq('id', leadId)
        .single();

      if (leadError || !data) {
        console.error('Tracking Error: Lead not found', leadId);
        return { success: false, error: 'Lead not found' };
      }
      lead = data;
      store = lead.stores;
      org = store?.organizations;

      if (!store) {
        console.error('Tracking Error: Store not found for lead', leadId);
        return { success: false, error: 'Store not found for this lead' };
      }
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const userPhone = phoneFallback || lead?.phone || '573000000000';
    
    // Función de ayuda para hashear strings en SHA-256 (Requisito de Facebook)
    const hashData = (str?: string) => str ? crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex') : undefined;

    const hashedPhone = userPhone ? crypto.createHash('sha256').update(userPhone.replace(/\D/g, '')).digest('hex') : undefined;
    
    // --- Detección Inteligente de Divisa (Multitienda/Multipais) ---
    const currencyMap: Record<string, string> = {
      'CO': 'COP', 'MX': 'MXN', 'PE': 'PEN', 'EC': 'USD', 'CL': 'CLP', 'AR': 'ARS'
    };
    const finalCurrency = (store?.country && currencyMap[store.country]) || currency;

    // Hashear parámetros adicionales para subir la calidad del evento (EMQ a 10/10)
    let fn, ln;
    if (lead?.name) {
      const parts = lead.name.trim().split(' ');
      fn = hashData(parts[0]);
      if (parts.length > 1) ln = hashData(parts.slice(1).join(' '));
    }
    const ct = hashData(lead?.city);
    const st = hashData(lead?.department);
    const country = hashData(store?.country || lead?.stores?.country || 'CO');

    const results: any = { facebook: [], tiktok: [], google: [] };

    // --- HELPER TO GET UNIQUE TARGETS ---
    function getUniqueTargets(storeId: string, storeToken: string, orgId: string, orgToken: string) {
      const targets = [];
      if (storeId && storeToken) targets.push({ id: storeId, token: storeToken });
      if (orgId && orgToken && orgId !== storeId) targets.push({ id: orgId, token: orgToken });
      return targets;
    }

    // --- FACEBOOK CAPI ---
    const fbTargets = getUniqueTargets(store?.meta_pixel_id, store?.meta_capi_token, org?.meta_pixel_id, org?.meta_capi_token);
    
    for (const target of fbTargets) {
      
      const userData: any = {
        external_id: [hashData(lead?.id || leadId)],
        ph: hashedPhone ? [hashedPhone] : [],
        ctwa_clid: lead?.ctwa_clid || undefined
      };
      
      if (fn) userData.fn = [fn];
      if (ln) userData.ln = [ln];
      if (ct) userData.ct = [ct];
      if (st) userData.st = [st];
      if (country) userData.country = [country];

      const fbPayload: any = {
        data: [{
          event_name: eventName,
          event_time: eventTime,
          action_source: "system_generated",
          user_data: userData,
          custom_data: {
            value: value || lead?.total_price || 0,
            currency: finalCurrency,
            content_name: lead?.product_name || undefined,
            contents: lead?.product_name ? [{ id: 'ITEM_01', quantity: 1, item_price: value || lead?.total_price || 0 }] : []
          }
        }]
      };

      if (testEventCode) {
        fbPayload.test_event_code = testEventCode;
      }

      try {
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/${target.id}/events?access_token=${target.token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbPayload)
        });
        results.facebook.push(await fbRes.json());
      } catch (e: any) {
        results.facebook.push({ error: 'Failed to send to FB CAPI', pixel: target.id, details: e.message });
      }
    }

    // --- TIKTOK EVENTS API ---
    const ttTargets = getUniqueTargets(store?.tiktok_pixel_id, store?.tiktok_access_token, org?.tiktok_pixel_id, org?.tiktok_access_token);

    for (const target of ttTargets) {
      const ttPayload = {
        pixel_code: target.id,
        event: eventName === 'Purchase' ? 'CompletePayment' : eventName,
        event_time: eventTime,
        context: {
          ad: { callback: lead?.ctwa_clid },
          user: { phone_number: hashedPhone }
        },
        properties: {
          contents: lead?.product_name ? [{ price: value || lead?.total_price || 0, quantity: 1, content_id: 'ITEM_01', content_name: lead.product_name }] : [],
          value: value || lead?.total_price || 0,
          currency: finalCurrency
        }
      };

      try {
        const ttRes = await fetch(`https://business-api.tiktok.com/open_api/v1.3/pixel/track/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Access-Token': target.token },
          body: JSON.stringify(ttPayload)
        });
        results.tiktok.push(await ttRes.json());
      } catch (e: any) {
        results.tiktok.push({ error: 'Failed to send to TikTok', pixel: target.id, details: e.message });
      }
    }

    // --- GOOGLE ADS ENHANCED CONVERSIONS (GA4 MEASUREMENT PROTOCOL) ---
    const ga4Targets = getUniqueTargets(store?.ga4_measurement_id, store?.ga4_api_secret, org?.ga4_measurement_id, org?.ga4_api_secret);
    
    for (const target of ga4Targets) {
      const clientId = hashedPhone || crypto.randomUUID();
      
      const ga4EventNameMap: Record<string, string> = {
        'ViewContent': 'view_item',
        'AddToCart': 'add_to_cart',
        'InitiateCheckout': 'begin_checkout',
        'Purchase': 'purchase',
        'Lead': 'generate_lead',
        'Contact': 'generate_lead',
        'SubmitForm': 'generate_lead'
      };
      const ga4EventName = ga4EventNameMap[eventName] || eventName.toLowerCase();

      const ga4Payload = {
        client_id: clientId,
        events: [{
          name: ga4EventName,
          params: {
            value: value || lead?.total_price || 0,
            currency: finalCurrency,
            session_id: '123',
            debug_mode: 1,
            transaction_id: ga4EventName === 'purchase' ? (lead?.id || leadId || crypto.randomUUID()) : undefined,
            items: lead?.product_name ? [{
              item_id: 'ITEM_01',
              item_name: lead.product_name,
              price: value || lead?.total_price || 0,
              quantity: 1
            }] : undefined
          }
        }]
      };
      
      try {
        const ga4Res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${target.id}&api_secret=${target.token}`, {
          method: 'POST',
          body: JSON.stringify(ga4Payload)
        });
        results.google.push({ status: ga4Res.ok ? 'Sent' : 'Error', id: target.id, code: ga4Res.status });
      } catch (e: any) {
        results.google.push({ error: 'Failed to send to GA4', id: target.id, details: e.message });
      }
    }

    return { success: true, results };

  } catch (err: any) {
    console.error('Tracking Helper Error:', err);
    return { success: false, error: err.message };
  }
}
