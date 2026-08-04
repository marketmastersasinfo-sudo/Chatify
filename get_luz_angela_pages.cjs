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
  const { data: waNumbers } = await supabase.from('whatsapp_numbers').select('*').like('business_manager', '%Luz Angela%');

  console.log('=====================================================================');
  console.log('BUSCANDO FAN PAGES DE FACEBOOK VINCULADAS AL PERFIL DE LUZ ANGELA');
  console.log('=====================================================================\n');

  const pageMap = new Map();

  for (const n of waNumbers) {
    if (!n.access_token) continue;

    // Call /me/accounts with token
    const res = await fetchGraph('/me/accounts?fields=id,name,category,access_token,instagram_business_account,tasks', n.access_token);
    
    if (res.status === 200 && res.data.data) {
      for (const p of res.data.data) {
        if (!pageMap.has(p.id)) {
          pageMap.set(p.id, {
            id: p.id,
            name: p.name,
            access_token: p.access_token,
            category: p.category,
            ig: p.instagram_business_account ? p.instagram_business_account.id : null,
            fromBM: n.business_manager
          });
        }
      }
    }
  }

  console.log(`🎉 Total de Fan Pages encontradas para Luz Angela: ${pageMap.size}\n`);

  for (const [id, p] of pageMap.entries()) {
    console.log(`📄 Fan Page: ${p.name}`);
    console.log(`   Page ID: ${p.id}`);
    console.log(`   Categoría: ${p.category || 'N/A'}`);
    console.log(`   Origen BM: ${p.fromBM}`);
    console.log(`   Instagram Business Vinculado: ${p.ig ? 'SI (' + p.ig + ')' : 'NO ❌'}`);
    console.log(`   Page Token Presente: ${p.access_token ? 'SÍ (' + p.access_token.substring(0, 15) + '...)' : 'NO'}`);
    console.log('---------------------------------------------------------------------');
  }
}

main();
