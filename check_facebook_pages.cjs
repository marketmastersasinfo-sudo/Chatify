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
  console.log('===========================================================');
  console.log('AUDITORÍA COMPLETA DE FAN PAGES (`connected_pages`)');
  console.log('===========================================================\n');

  const { data: pages, error } = await supabase.from('connected_pages').select('*');
  if (error) {
    console.error('Error fetching connected_pages:', error);
    return;
  }

  console.log(`Total Fan Pages en DB: ${pages ? pages.length : 0}\n`);

  for (const page of pages) {
    console.log(`📄 Fan Page: ${page.page_name || page.name}`);
    console.log(`   Page ID: ${page.page_id}`);
    console.log(`   Store ID vinculado: ${page.store_id || '(Sin vincular/Genérica)'}`);
    console.log(`   Instagram Business Account ID: ${page.instagram_business_account_id || page.instagram_account_id || 'SIN IG ❌'}`);
    console.log(`   Access Token presente: ${page.access_token ? 'SÍ (' + page.access_token.substring(0, 15) + '...)' : 'NO ❌'}`);

    if (page.access_token && page.page_id) {
      // Probar token con Graph API para la página
      const pageRes = await fetchGraph(`/${page.page_id}?fields=name,link,instagram_business_account`, page.access_token);
      if (pageRes.status === 200) {
        console.log(`   ✅ Estado Meta Graph API: 200 OK (Nombre en Meta: ${pageRes.data.name})`);
        if (pageRes.data.instagram_business_account) {
          console.log(`      IG Business Account en Meta: ${pageRes.data.instagram_business_account.id}`);
        } else {
          console.log(`      ⚠️ Sin Instagram Business vinculado en Meta.`);
        }
      } else {
        console.log(`   ❌ Estado Meta Graph API: ERROR ${pageRes.status} -> ${pageRes.data.error?.message || JSON.stringify(pageRes.data)}`);
      }
    }
    console.log('-----------------------------------------------------------');
  }
}

main();
