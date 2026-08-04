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
  console.log('EVALUANDO PÁGINAS ADICIONALES DEL FACEBOOK DE PAULA');
  console.log('===========================================================\n');

  const vitContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');
  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');

  const tokenRegex = /(EAA[A-Za-z0-9]+)/g;
  const tokenList = [];
  let match;
  while ((match = tokenRegex.exec(vitContent)) !== null) tokenList.push(match[1]);
  while ((match = tokenRegex.exec(masterContent)) !== null) tokenList.push(match[1]);

  const paulaPages = [
    { name: 'Techshop', id: '744788825592163' },
    { name: 'Lacompracion1', id: '107828415023636' },
    { name: 'Argenshop', id: '913951868459621' },
    { name: 'Chileshop', id: '929122393610559' },
    { name: 'VisteT', id: '625890813915309' }
  ];

  for (const page of paulaPages) {
    let successToken = null;
    for (const t of tokenList) {
      const res = await callGraph(`/${page.id}/subscribed_apps?subscribed_fields=feed&access_token=${t}`, 'POST');
      if (res.data && res.data.success) {
        successToken = t;
        console.log(`🎉 ¡SUCCESS PARA ${page.name} (ID: ${page.id})!`);
        await supabase.from('connected_pages').upsert({
          page_id: page.id,
          page_name: page.name,
          access_token: t,
          is_active: true
        }, { onConflict: 'page_id' });
        break;
      }
    }
    if (!successToken) {
      console.log(`ℹ️ ${page.name} (ID: ${page.id}) requiere 2FA o token específico en Meta.`);
    }
    console.log('-----------------------------------------------------------');
  }
}

main();
