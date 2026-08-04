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

async function main() {
  const { data: waNumbers } = await supabase.from('whatsapp_numbers').select('*').like('business_manager', '%Paula%');
  console.log('====================================================');
  console.log('AUDITORÍA COMPLETA PARA PERFIL DE PAULA (6 NÚMEROS)');
  console.log('====================================================\n');

  for (const n of waNumbers) {
    console.log(`📱 ${n.display_name} (${n.phone_number})`);
    console.log(`   BM: ${n.business_manager}`);
    console.log(`   Phone ID: ${n.phone_number_id}`);
    console.log(`   WABA ID: ${n.waba_id}`);
    
    // Check Phone ID
    const phoneRes = await fetchGraph(`/${n.phone_number_id}`, n.access_token);
    if (phoneRes.status === 200) {
      console.log(`   ✅ Phone ID Meta: OK (${phoneRes.data.display_phone_number || phoneRes.data.verified_name})`);
    } else {
      console.log(`   ❌ Phone ID Meta: ERROR (${phoneRes.status}) -> ${phoneRes.data.error?.message}`);
    }

    // Check WABA Templates
    const wabaRes = await fetchGraph(`/${n.waba_id}/message_templates`, n.access_token);
    if (wabaRes.status === 200) {
      const tpls = wabaRes.data.data || [];
      const app = tpls.filter(t => t.status === 'APPROVED');
      console.log(`   ✅ WABA Templates: OK (${tpls.length} total, ${app.length} aprobadas)`);
      if (app.length > 0) {
        console.log(`      Nombres: ${app.map(t => t.name).join(', ')}`);
      }
    } else {
      console.log(`   ⚠️ WABA Templates query: (${wabaRes.status}) -> ${wabaRes.data.error?.message}`);
    }

    console.log('----------------------------------------------------');
  }
}

main();
