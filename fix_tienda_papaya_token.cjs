const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

function callGraph(path, method = 'GET', bodyData = null) {
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
  console.log('BUSCANDO TOKEN ADMIN VÁLIDO PARA TIENDA-PAPAYA');
  console.log('===========================================================\n');

  const pageId = '102931295954679';
  const vitContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');
  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');

  const tokenRegex = /(EAA[A-Za-z0-9]+)/g;
  const tokenList = [];
  let match;
  while ((match = tokenRegex.exec(vitContent)) !== null) tokenList.push(match[1]);
  while ((match = tokenRegex.exec(masterContent)) !== null) tokenList.push(match[1]);

  for (let i = 0; i < tokenList.length; i++) {
    const t = tokenList[i];
    const subRes = await callGraph(`/${pageId}/subscribed_apps?subscribed_fields=feed&access_token=${t}`, 'POST');
    if (subRes.data && subRes.data.success) {
      console.log(`🎉 ¡TOKEN #${i+1} SUSCRIBIÓ EXITOSAMENTE TIENDA-PAPAYA AL WEBHOOK!`);
      // Update token in Supabase
      await supabase.from('connected_pages').update({ access_token: t }).eq('page_id', pageId);
      console.log('✅ Token actualizado en Supabase!');
      break;
    } else {
      console.log(`Token #${i+1}:`, subRes.data?.error?.message || subRes.data);
    }
  }
}

main();
