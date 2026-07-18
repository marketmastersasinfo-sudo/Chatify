import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { store_id } = req.query;

  if (!store_id) {
    return res.status(400).json({ error: 'store_id is required' });
  }

  try {
    // 1. Get WABA and access token
    const { data: waNumber } = await supabase
      .from('whatsapp_numbers')
      .select('waba_id, access_token')
      .eq('store_id', store_id)
      .single();

    if (!waNumber || !waNumber.waba_id || !waNumber.access_token) {
      return res.status(404).json({ error: 'No WhatsApp number configured for this store' });
    }

    // 2. Fetch billing info from Meta Graph API
    // We need to query the WABA node
    const wabaId = waNumber.waba_id;
    const token = waNumber.access_token;
    
    // First, try to get basic currency and account info
    let metaBilling = null;
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}?fields=currency,account_review_status,message_template_namespace`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (metaRes.ok) {
        metaBilling = await metaRes.json();
      }
    } catch(e) {
      console.error('Meta API error:', e);
    }

    // 3. Get AI costs from our log
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const startDate = `${currentMonth}-01T00:00:00Z`;
    
    const { data: aiLogs } = await supabase
      .from('ai_usage_log')
      .select('estimated_cost_usd, total_tokens, provider')
      .eq('store_id', store_id)
      .gte('created_at', startDate);

    let totalAiCost = 0;
    let totalTokens = 0;
    const providerCosts: Record<string, number> = {};

    if (aiLogs) {
      aiLogs.forEach((log: any) => {
        totalAiCost += Number(log.estimated_cost_usd) || 0;
        totalTokens += Number(log.total_tokens) || 0;
        
        providerCosts[log.provider] = (providerCosts[log.provider] || 0) + (Number(log.estimated_cost_usd) || 0);
      });
    }

    // 4. Get Google Maps costs from counter
    const { data: mapsLog } = await supabase
      .from('api_usage_counters')
      .select('request_count, estimated_cost_usd')
      .eq('store_id', store_id)
      .eq('api_name', 'google_street_view')
      .eq('month', currentMonth)
      .maybeSingle();

    const mapsCost = mapsLog?.estimated_cost_usd || 0;
    const mapsRequests = mapsLog?.request_count || 0;

    return res.status(200).json({
      meta: {
        currency: metaBilling?.currency || 'USD',
        status: metaBilling?.account_review_status || 'UNKNOWN',
        // We can't get credit card info directly from WABA node without business_management permissions
        // and querying the ad account/payment node, which requires the ad account ID.
        // For now, we return what we can access with whatsapp_business_messaging scope.
      },
      ai: {
        total_cost_usd: Number(totalAiCost.toFixed(4)),
        total_tokens: totalTokens,
        by_provider: providerCosts
      },
      maps: {
        total_cost_usd: Number(mapsCost.toFixed(4)),
        requests: mapsRequests
      },
      total_cost_usd: Number((totalAiCost + mapsCost).toFixed(4)),
      month: currentMonth
    });

  } catch (error: any) {
    console.error('Billing Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
