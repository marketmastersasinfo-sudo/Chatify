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
  console.log('SUSCRIBIENDO FEED A OFERTAZO.CO EN META GRAPH API');
  console.log('===========================================================\n');

  const { data: ofertazo } = await supabase
    .from('connected_pages')
    .select('*')
    .eq('page_id', '113460161573247')
    .single();

  // Try subscribing feed field
  const res = await callGraph(`/${ofertazo.page_id}/subscribed_apps?subscribed_fields=feed&access_token=${ofertazo.access_token}`, 'POST');
  console.log('Resultado Suscripción Feed:', JSON.stringify(res.data));

  // Check subscriptions
  const checkRes = await callGraph(`/${ofertazo.page_id}/subscribed_apps?access_token=${ofertazo.access_token}`);
  console.log('Suscripciones Activas Meta App:', JSON.stringify(checkRes.data));
}

main();
