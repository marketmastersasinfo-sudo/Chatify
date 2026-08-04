const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

function callGraph(path, method = 'POST', bodyData = null) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v20.0${path}`;
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (bodyData) req.write(JSON.stringify(bodyData));
    req.end();
  });
}

async function main() {
  console.log('===========================================================');
  console.log('REVISANDO TODAS LAS DEMÁS FAN PAGES EN LOS ARCHIVOS MAESTROS');
  console.log('===========================================================\n');

  const file1 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\luz_angela_v3.txt';
  const file2 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\paula_rojas_v3.txt';
  const vitContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');
  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');

  const tokenRegex = /(EAA[A-Za-z0-9]+)/g;
  const tokenList = [];
  let match;
  while ((match = tokenRegex.exec(vitContent)) !== null) tokenList.push(match[1]);
  while ((match = tokenRegex.exec(masterContent)) !== null) tokenList.push(match[1]);

  // Page IDs from master docs
  const candidateIds = [
    { name: 'Drakkars (clickshoes3)', id: '112122315124969' },
    { name: 'Shopyganga (clickshoes)', id: '122097131372016938' },
    { name: 'Monshop (Luz Angela)', id: '292582997267427' },
    { name: 'Yaencasa (Luz Angela)', id: '1001785999550638' },
    { name: 'Costaricashop', id: '1080214177399813' },
    { name: 'Perushop', id: '2525599207810702' },
    { name: 'Veneshop', id: '1059853547214118' },
    { name: 'VisteT', id: '625890813915309' },
    { name: 'Paraguashop', id: '847164308486909' },
    { name: 'Panamashop', id: '919181894604995' }
  ];

  for (const page of candidateIds) {
    for (const t of tokenList) {
      const subRes = await callGraph(`/${page.id}/subscribed_apps?subscribed_fields=feed&access_token=${t}`, 'POST');
      if (subRes.data && subRes.data.success) {
        console.log(`🎉 ¡SUCCESS PARA ${page.name} (ID: ${page.id})!`);
        // Upsert into connected_pages
        await supabase.from('connected_pages').upsert({
          page_id: page.id,
          page_name: page.name,
          access_token: t,
          is_active: true
        }, { onConflict: 'page_id' });
        break;
      }
    }
  }
}

main();
