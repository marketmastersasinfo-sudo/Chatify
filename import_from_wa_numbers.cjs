const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

function fetchGraph(path, token) {
  return new Promise((resolve) => {
    const sep = path.includes('?') ? '&' : '?';
    const url = `https://graph.facebook.com/v20.0${path}${sep}access_token=${token}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    }).on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });
  });
}

function classifyTemplate(name) {
  const n = name.toLowerCase();
  if (n.includes('confirmacion') || n.includes('confirm')) return 'order_confirmation';
  if (n.includes('carrito') || n.includes('cart') || n.includes('abandonad')) return 'abandoned_cart';
  if (n.includes('seguimiento') || n.includes('tracking') || n.includes('reparto') || n.includes('guia')) return 'tracking';
  if (n.includes('novedad')) return 'issue_delivery';
  return 'custom';
}

async function main() {
  console.log('🔄 Importando plantillas aprobadas desde Meta a Supabase...');
  const { data: waNumbers } = await supabase.from('whatsapp_numbers').select('*');

  if (!waNumbers) return;

  for (const num of waNumbers) {
    if (!num.waba_id || !num.access_token || !num.store_id) {
      console.log(`⚠️ Registro ${num.display_name} no tiene WABA ID, Token o store_id. Saltando...`);
      continue;
    }

    console.log(`\n📥 Consultando plantillas para ${num.display_name} (WABA: ${num.waba_id})...`);
    const res = await fetchGraph(`/${num.waba_id}/message_templates?limit=100`, num.access_token);
    
    if (res.status !== 200) {
      console.log(`❌ Error Meta para ${num.display_name}: ${res.data?.error?.message || JSON.stringify(res.data)}`);
      continue;
    }

    const templates = res.data.data || [];
    const approved = templates.filter(t => t.status === 'APPROVED');
    console.log(`   ✅ Encontradas ${approved.length} plantillas APROBADAS en Meta.`);

    // Get existing local templates for this store
    const { data: existingLocal } = await supabase
      .from('store_templates')
      .select('template_name')
      .eq('store_id', num.store_id);

    const existingSet = new Set((existingLocal || []).map(e => e.template_name));

    let inserted = 0;
    for (const t of approved) {
      if (existingSet.has(t.name)) continue;

      const type = classifyTemplate(t.name);
      const { error } = await supabase.from('store_templates').insert({
        store_id: num.store_id,
        template_name: t.name,
        template_type: type,
        is_active: true,
        sent_count: 0,
        conversion_count: 0
      });

      if (!error) inserted++;
      else console.error(`   Error insertando ${t.name}:`, error.message);
    }

    console.log(`   ✅ Sincronizadas ${inserted} plantillas aprobadas NUEVAS en DB para ${num.display_name}.`);
  }

  console.log('\n🎉 Sincronización masiva de plantillas finalizada.');
}

main();
