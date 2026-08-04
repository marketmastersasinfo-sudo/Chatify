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
  const { data: stores, error } = await supabase.from('stores').select('*').order('name');
  if (error) {
    console.error('Error fetching stores:', error);
    return;
  }

  console.log('===========================================================');
  console.log('AUDITORÍA DE CONEXIÓN META GRAPH API Y PLANTILLAS POR TIENDA');
  console.log('===========================================================');

  for (const s of stores) {
    console.log(`\n🏬 Tienda: ${s.name} (ID: ${s.id})`);
    console.log(`   WABA Number en DB: ${s.waba_number || 'N/A'}`);
    console.log(`   Phone ID: ${s.meta_phone_number_id || 'FALTA ❌'}`);
    console.log(`   WABA ID: ${s.meta_waba_id || 'FALTA ❌'}`);
    console.log(`   WA Activo: ${s.meta_wa_active}`);

    if (!s.meta_access_token) {
      console.log(`   ❌ Token: NO EXISTE EN SUPABASE`);
      continue;
    }

    console.log(`   🔑 Token: Presente (${s.meta_access_token.substring(0, 15)}...)`);

    // 1. Probar Phone ID en Meta API si existe
    if (s.meta_phone_number_id) {
      const phoneRes = await fetchGraph(`/${s.meta_phone_number_id}`, s.meta_access_token);
      if (phoneRes.status === 200) {
        console.log(`   ✅ Conexión Teléfono Meta: OK! (Display Name: ${phoneRes.data.display_phone_number || phoneRes.data.verified_name || 'OK'})`);
      } else {
        console.log(`   ❌ Conexión Teléfono Meta: ERROR ${phoneRes.status} -> ${JSON.stringify(phoneRes.data.error?.message || phoneRes.data)}`);
      }
    }

    // 2. Probar WABA Templates en Meta API si existe
    if (s.meta_waba_id) {
      const tplRes = await fetchGraph(`/${s.meta_waba_id}/message_templates`, s.meta_access_token);
      if (tplRes.status === 200) {
        const approved = (tplRes.data.data || []).filter(t => t.status === 'APPROVED');
        console.log(`   ✅ Plantillas en Meta API: ${tplRes.data.data?.length || 0} registradas (${approved.length} APROBADAS)`);
        if (approved.length > 0) {
          console.log(`      Aprobadas: ${approved.map(t => t.name).join(', ')}`);
        }
      } else {
        console.log(`   ❌ Plantillas Meta API: ERROR ${tplRes.status} -> ${JSON.stringify(tplRes.data.error?.message || tplRes.data)}`);
      }
    }
  }
}

main();
