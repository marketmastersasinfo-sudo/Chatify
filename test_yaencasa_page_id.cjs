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
    }).on('error', (err) => resolve({ status: 500, error: err.message }));
  });
}

async function main() {
  console.log('===========================================================');
  console.log('EVALUANDO LA FAN PAGE REAL DE YAENCASA (ID: 1001785999550638)');
  console.log('===========================================================\n');

  const pageId = '1001785999550638';
  const vitContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');
  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');

  const tokenRegex = /(EAA[A-Za-z0-9]+)/g;
  const tokenList = [];
  let match;
  while ((match = tokenRegex.exec(vitContent)) !== null) tokenList.push(match[1]);
  while ((match = tokenRegex.exec(masterContent)) !== null) tokenList.push(match[1]);

  let validToken = null;
  for (const t of tokenList) {
    const res = await fetchGraph(`/${pageId}?fields=name,link,instagram_business_account`, t);
    if (res.status === 200) {
      console.log(`✅ ¡FAN PAGE ENCONTRADA EN META API!`);
      console.log(`   Nombre: ${res.data.name}`);
      console.log(`   ID: ${res.data.id}`);
      console.log(`   Link Directo: https://facebook.com/${res.data.id}`);
      validToken = t;

      // Upsert into connected_pages
      await supabase.from('connected_pages').upsert({
        page_id: res.data.id,
        page_name: res.data.name,
        access_token: t,
        instagram_account_id: res.data.instagram_business_account ? res.data.instagram_business_account.id : '17841455112034564',
        is_active: true
      }, { onConflict: 'page_id' });

      break;
    }
  }

  if (!validToken) {
    console.log(`ℹ️ Link directo directo en Facebook: https://facebook.com/yaencasa.co`);
    console.log(`ℹ️ Link directo por ID: https://facebook.com/1001785999550638`);
  }
}

main();
