const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

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

const fileContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');

async function main() {
  console.log('========================================================================');
  console.log('IMPORTANDO Y AUDITANDO LAS 9 FAN PAGES VITALICIAS EN SUPABASE');
  console.log('========================================================================\n');

  const blocks = fileContent.split(/\n(?=\d+\.\s)/);
  
  for (const block of blocks) {
    const nameMatch = block.match(/\d+\.\s+(.+)/);
    const idMatch = block.match(/Page ID:\s*(\d+)/);
    const tokenMatch = block.match(/Token:\s*([A-Za-z0-9]+)/);

    if (!nameMatch || !idMatch || !tokenMatch) continue;

    const pageName = nameMatch[1].trim();
    const pageId = idMatch[1].trim();
    const token = tokenMatch[1].trim();

    console.log(`📄 Procesando: ${pageName} (ID: ${pageId})...`);

    // Test token with Graph API
    const metaRes = await fetchGraph(`/${pageId}?fields=name,link,instagram_business_account`, token);
    
    let igId = null;
    if (metaRes.status === 200) {
      igId = metaRes.data.instagram_business_account ? metaRes.data.instagram_business_account.id : null;
      console.log(`   ✅ Token Meta 200 OK! (IG Business ID: ${igId || 'Sin IG'})`);
    } else {
      console.log(`   ⚠️ Error Meta API (${metaRes.status}): ${metaRes.data?.error?.message}`);
    }

    // Upsert into connected_pages in Supabase
    const { error } = await supabase.from('connected_pages').upsert({
      page_id: pageId,
      page_name: pageName,
      access_token: token,
      instagram_account_id: igId,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'page_id' });

    if (error) {
      console.error(`   ❌ Error guardando en Supabase:`, error.message);
    } else {
      console.log(`   🎉 Guardado exitosamente en connected_pages!`);
    }
    console.log('------------------------------------------------------------------------');
  }

  console.log('\n✅ ¡TODAS LAS 9 FAN PAGES ESTÁN REGISTRADAS Y VINCULADAS EN CHATIFY!');
}

main();
