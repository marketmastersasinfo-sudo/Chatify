import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function recover() {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, store_id')
    .in('phone', ['573209158770', '573127653982']); // . y naty

  for (const lead of leads) {
    console.log(`Disparando webhook para ${lead.name}`);
    
    const params = new URLSearchParams();
    params.append('From', `whatsapp:+${lead.phone}`);
    params.append('To', 'whatsapp:+18106666654'); // Tu twilio number
    params.append('ProfileName', lead.name);
    params.append('Body', '[El cliente contactó desde un anuncio solicitando información]');

    try {
      const res = await fetch('https://chatify-teal-xi.vercel.app/api/twilio-webhook', {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      console.log(`✅ Webhook disparado. Status: ${res.status}`);
    } catch (err) {
      console.log(`❌ Error al disparar webhook:`, err);
    }
  }
}
recover();
