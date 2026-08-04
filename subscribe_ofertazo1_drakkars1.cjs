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
  const targetIds = ['121527094237675', '112091225194186']; // Ofertazo1 and Drakkars1
  const { data: pages } = await supabase.from('connected_pages').select('*');

  for (const pageId of targetIds) {
    const page = pages.find(p => p.page_id === pageId);
    if (page && page.access_token) {
      console.log(`Evaluando: ${page.page_name} (ID: ${pageId})...`);
      const res = await callGraph(`/${pageId}/subscribed_apps?subscribed_fields=feed&access_token=${page.access_token}`, 'POST');
      console.log(`   Resultado:`, JSON.stringify(res.data));
    }
  }
}

main();
