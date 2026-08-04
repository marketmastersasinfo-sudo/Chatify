const { createClient } = require('@supabase/supabase-js');
const https = require('https');

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
  console.log('========================================================================');
  console.log('SUSCRIBIENDO LAS 18 FAN PAGES AL WEBHOOK FEED EN META GRAPH API');
  console.log('========================================================================\n');

  const { data: pages } = await supabase.from('connected_pages').select('*');
  if (!pages || pages.length === 0) {
    console.log('No se encontraron páginas.');
    return;
  }

  for (const p of pages) {
    console.log(`📄 Suscribiendo Feed: ${p.page_name} (Page ID: ${p.page_id})...`);
    const subRes = await callGraph(`/${p.page_id}/subscribed_apps?subscribed_fields=feed&access_token=${p.access_token}`, 'POST');
    if (subRes.data && subRes.data.success) {
      console.log(`   ✅ Webhook Feed Suscrito Exitosamente: {"success":true}`);
    } else {
      console.log(`   ⚠️ Respuesta Meta:`, JSON.stringify(subRes.data));
    }
    console.log('------------------------------------------------------------------------');
  }
}

main();
