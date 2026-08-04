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
  const { data: pages } = await supabase.from('connected_pages').select('*');
  const igPages = pages.filter(p => p.access_token && p.instagram_account_id);
  
  console.log(`Evaluando permisos de IG en ${igPages.length} páginas:\n`);
  
  for (const page of igPages) {
    const res = await callGraph(`/debug_token?input_token=${page.access_token}&access_token=${page.access_token}`);
    
    if (res.status === 200 && res.data.data) {
      const scopes = res.data.data.scopes || [];
      const hasIgComments = scopes.includes('instagram_manage_comments');
      const hasIgMessages = scopes.includes('instagram_manage_messages');
      const hasIgBasic = scopes.includes('instagram_basic');
      
      console.log(`📱 ${page.page_name} (IG: ${page.instagram_account_id})`);
      console.log(`   - instagram_basic: ${hasIgBasic ? '✅' : '❌'}`);
      console.log(`   - instagram_manage_comments: ${hasIgComments ? '✅' : '❌'}`);
      console.log(`   - instagram_manage_messages: ${hasIgMessages ? '✅' : '❌'}`);
    } else {
      console.log(`📱 ${page.page_name} -> Error obteniendo scopes.`);
    }
  }
}

main();
