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
  console.log('===========================================================');
  console.log('DIAGNÓSTICO COMPLETO GUATESHOP (ID: 472186185978780)');
  console.log('===========================================================\n');

  const pageId = '472186185978780';
  const { data: page } = await supabase.from('connected_pages').select('*').eq('page_id', pageId).single();

  if (!page) {
    console.log('Guateshop no está en connected_pages');
    return;
  }

  console.log(`Page Name: ${page.page_name}`);
  console.log(`Token Presente: ${page.access_token ? 'SÍ' : 'NO'}`);

  // Try subscribing
  const subRes = await callGraph(`/${pageId}/subscribed_apps?subscribed_fields=feed&access_token=${page.access_token}`, 'POST');
  console.log('Resultado Suscripción Webhook:', JSON.stringify(subRes.data));

  // Check subscriptions
  const checkRes = await callGraph(`/${pageId}/subscribed_apps?access_token=${page.access_token}`);
  console.log('Suscripciones Activas Meta App:', JSON.stringify(checkRes.data));
}

main();
