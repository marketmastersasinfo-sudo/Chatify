const { createClient } = require('@supabase/supabase-js');
const https = require('https');

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
  const pageIds = ['101216662831801', '861033647099708']; // Ofertazo and Shopmex
  
  for (const pageId of pageIds) {
    const { data: page } = await supabase.from('connected_pages').select('*').eq('page_id', pageId).single();
    console.log(`Activar Webhook para ${page ? page.page_name : pageId}...`);
    const res = await callGraph(`/${pageId}/subscribed_apps?subscribed_fields=feed&access_token=${page.access_token}`, 'POST');
    console.log(`Resultado ${page ? page.page_name : pageId}:`, JSON.stringify(res.data));
  }
}

main();
