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
  const pageId = '121527094237675'; // Ofertazo1
  const { data: pageData } = await supabase.from('connected_pages').select('access_token').eq('page_id', pageId).single();
  
  if (!pageData) return console.log("No token for Ofertazo1");

  console.log("Fetching /feed...");
  const feedRes = await callGraph(`/${pageId}/feed?fields=id,message,from,created_time,status_type,story&access_token=${pageData.access_token}`);
  console.log(JSON.stringify(feedRes.data, null, 2));

  console.log("\nFetching /tagged...");
  const taggedRes = await callGraph(`/${pageId}/tagged?fields=id,message,from,created_time,status_type,story&access_token=${pageData.access_token}`);
  console.log(JSON.stringify(taggedRes.data, null, 2));
}

main();
