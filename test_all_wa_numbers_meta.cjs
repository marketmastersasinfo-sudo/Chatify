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

async function main() {
  const { data: waNumbers, error } = await supabase.from('whatsapp_numbers').select('*');
  if (error) {
    console.error(error);
    return;
  }

  console.log('================================================================');
  console.log('PRUEBA DE CONEXIÓN CON META GRAPH API PARA LOS 13 NÚMEROS');
  console.log('================================================================\n');

  for (const item of waNumbers) {
    console.log(`📱 ${item.display_name} (${item.phone_number})`);
    console.log(`   BM: ${item.business_manager}`);
    console.log(`   Phone ID: ${item.phone_number_id}`);
    console.log(`   WABA ID: ${item.waba_id}`);

    // Test WABA Templates
    const tplRes = await fetchGraph(`/${item.waba_id}/message_templates`, item.access_token);
    if (tplRes.status === 200) {
      const templates = tplRes.data.data || [];
      const approved = templates.filter(t => t.status === 'APPROVED');
      console.log(`   ✅ META WABA CONECTADO OK! Total plantillas en Meta: ${templates.length} (${approved.length} APROBADAS)`);
      if (templates.length > 0) {
        console.log(`      Plantillas en Meta: ${templates.map(t => `${t.name} (${t.status})`).join(', ')}`);
      }
    } else {
      console.log(`   ❌ ERROR META (${tplRes.status}): ${tplRes.data.error?.message || JSON.stringify(tplRes.data)}`);
    }
    console.log('----------------------------------------------------------------');
  }
}

main();
