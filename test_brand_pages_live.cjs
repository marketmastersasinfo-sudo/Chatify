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

const brandPages = [
  { name: 'Tienda-papaya', id: '102931295954679' },
  { name: 'Donde los Primos Col', id: '397141068823172' },
  { name: 'Uwashop Col', id: '437549416106137' },
  { name: 'Yaencasa Col', id: '571012919924' },
  { name: 'Compras en un click', id: '104827507849835' }
];

async function main() {
  console.log('===========================================================');
  console.log('VERIFICANDO FAN PAGES DE NOMBRE DE MARCA DIRECTA EN META');
  console.log('===========================================================\n');

  const vitContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');
  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');
  const tokenRegex = /(EAA[A-Za-z0-9]+)/g;
  const tokenList = [];
  let match;
  while ((match = tokenRegex.exec(vitContent)) !== null) tokenList.push(match[1]);
  while ((match = tokenRegex.exec(masterContent)) !== null) tokenList.push(match[1]);

  for (const page of brandPages) {
    console.log(`📄 Probando: ${page.name} (Page ID: ${page.id})...`);
    let found = false;
    for (const t of tokenList) {
      const res = await fetchGraph(`/${page.id}?fields=name,link,instagram_business_account`, t);
      if (res.status === 200) {
        found = true;
        console.log(`   ✅ Meta API 200 OK! Link: https://facebook.com/${page.id}`);
        // Upsert into connected_pages
        await supabase.from('connected_pages').upsert({
          page_id: page.id,
          page_name: page.name,
          access_token: t,
          instagram_account_id: res.data.instagram_business_account ? res.data.instagram_business_account.id : null,
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'page_id' });
        break;
      }
    }
    if (!found) {
      console.log(`   ℹ️ Link directo en Facebook: https://facebook.com/${page.id}`);
    }
    console.log('-----------------------------------------------------------');
  }
}

main();
