const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

function fetchGraph(path, token) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v20.0${path}?access_token=${token}`;
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
  console.log('🔄 Importando plantillas aprobadas desde Meta a store_templates...');
  const { data: stores } = await supabase.from('stores').select('*');

  if (!stores) return;

  for (const s of stores) {
    if (!s.meta_waba_id || !s.meta_access_token) {
      console.log(`⚠️ Tienda ${s.name} no tiene WABA ID o Token. Saltando...`);
      continue;
    }

    console.log(`\n📥 Consultando plantillas para ${s.name} (WABA: ${s.meta_waba_id})...`);
    const res = await fetchGraph(`/${s.meta_waba_id}/message_templates?limit=100`, s.meta_access_token);
    
    if (res.status !== 200) {
      console.log(`❌ Error Meta para ${s.name}: ${res.data?.error?.message || JSON.stringify(res.data)}`);
      continue;
    }

    const templates = res.data.data || [];
    const approved = templates.filter(t => t.status === 'APPROVED');
    console.log(`   ✅ Encontradas ${approved.length} plantillas APROBADAS en Meta.`);

    let inserted = 0;
    for (const t of approved) {
      const type = classifyTemplate(t.name);
      const { error } = await supabase.from('store_templates').upsert({
        store_id: s.id,
        template_name: t.name,
        template_type: type,
        is_active: true,
        sent_count: 0,
        conversion_count: 0
      }, { onConflict: 'store_id,template_name' });

      if (!error) inserted++;
    }

    console.log(`   ✅ Sincronizadas ${inserted} plantillas en DB para ${s.name}.`);
  }

  console.log('\n🎉 Importación masiva de plantillas finalizada.');
}

main();
