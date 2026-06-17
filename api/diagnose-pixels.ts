import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { firePixelEvent } from './utils/_tracking';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const report: any = {
    step1_pixelConfig: {},
    step2_testEventResult: null,
    step3_summary: {}
  };

  try {
    // PASO 1: Revisar qué tiendas tienen píxeles configurados
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, meta_pixel_id, meta_capi_token, tiktok_pixel_id, tiktok_access_token, ga4_measurement_id, ga4_api_secret, organization_id, organizations(meta_pixel_id, meta_capi_token, tiktok_pixel_id, tiktok_access_token, ga4_measurement_id, ga4_api_secret)');

    if (!stores || stores.length === 0) {
      return res.status(200).json({ error: 'No stores found' });
    }

    for (const s of stores) {
      const org = (s as any).organizations;
      report.step1_pixelConfig[s.name || s.id] = {
        meta_pixel: s.meta_pixel_id || org?.meta_pixel_id || '❌ NO CONFIGURADO',
        meta_token: (s.meta_capi_token || org?.meta_capi_token) ? '✅ Configurado' : '❌ NO CONFIGURADO',
        tiktok_pixel: s.tiktok_pixel_id || org?.tiktok_pixel_id || '❌ NO CONFIGURADO',
        tiktok_token: (s.tiktok_access_token || org?.tiktok_access_token) ? '✅ Configurado' : '❌ NO CONFIGURADO',
        ga4_id: s.ga4_measurement_id || org?.ga4_measurement_id || '❌ NO CONFIGURADO',
        ga4_secret: (s.ga4_api_secret || org?.ga4_api_secret) ? '✅ Configurado' : '❌ NO CONFIGURADO'
      };
    }

    // PASO 2: Buscar un lead real para disparar un evento de PRUEBA
    const { data: testLead } = await supabase
      .from('leads')
      .select('id, name, phone, store_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!testLead) {
      report.step2_testEventResult = { error: 'No hay leads para probar' };
    } else {
      report.step2_testEventResult = {
        leadUsed: { id: testLead.id, name: testLead.name, phone: testLead.phone },
        eventFired: 'Lead',
        rawResponse: await firePixelEvent(supabase, testLead.id, 'Lead', 1, 'COP', testLead.phone)
      };
    }

    // PASO 3: Resumen
    const testResult = report.step2_testEventResult?.rawResponse;
    if (testResult) {
      report.step3_summary = {
        facebook: testResult.results?.facebook 
          ? (testResult.results.facebook.events_received ? `✅ FUNCIONA (${testResult.results.facebook.events_received} eventos recibidos)` : `❌ ERROR: ${JSON.stringify(testResult.results.facebook)}`)
          : '⚠️ No configurado - no se envió',
        tiktok: testResult.results?.tiktok
          ? (testResult.results.tiktok.code === 0 ? '✅ FUNCIONA' : `❌ ERROR: ${JSON.stringify(testResult.results.tiktok)}`)
          : '⚠️ No configurado - no se envió',
        google: testResult.results?.google
          ? (testResult.results.google.status === 'Sent' ? '✅ FUNCIONA' : `❌ ERROR: ${JSON.stringify(testResult.results.google)}`)
          : '⚠️ No configurado - no se envió'
      };
    }

    return res.status(200).json(report);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
