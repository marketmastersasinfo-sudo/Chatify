import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function recoverLeads() {
  const { data: leads } = await supabase
    .from('leads')
    .select('*, stores(twilio_phone_number)')
    .eq('status', 'new')
    .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  const lostLeads = [];
  for (const lead of leads || []) {
    const { data: messages } = await supabase.from('messages').select('id').eq('lead_id', lead.id);
    if (!messages || messages.length === 0) {
      lostLeads.push(lead);
    }
  }

  console.log(`Recuperando ${lostLeads.length} leads...`);

  for (const lead of lostLeads) {
    if (!lead.product_name) continue; // Si no hay producto, no sabemos qué quería

    const origin = lead.traffic_source === 'TikTok Ads' ? 'TikTok' : 'Facebook';
    const text = `¡Hola! Vi su anuncio en ${origin} y me encantaría pedir información sobre: ${lead.product_name}`;
    const storePhone = lead.stores?.twilio_phone_number;

    if (!storePhone) {
      console.log(`❌ Saltando ${lead.name} - No se encontró teléfono de la tienda.`);
      continue;
    }

    const payload = new URLSearchParams({
      From: `whatsapp:+${lead.phone}`,
      To: `whatsapp:+${storePhone}`,
      ProfileName: lead.name,
      Body: text
    });

    try {
      const res = await fetch('https://chatify-teal-xi.vercel.app/api/twilio-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload.toString()
      });

      console.log(`✅ [${res.status}] Recuperado: ${lead.name} (${lead.phone})`);
    } catch (e) {
      console.log(`❌ Error recuperando ${lead.name}:`, e.message);
    }

    // Esperar 2 segundos para no saturar Vercel ni Twilio ni OpenAI
    await delay(2000);
  }

  console.log("¡Recuperación completada!");
}

recoverLeads();
