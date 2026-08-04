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
  console.log('===========================================================');
  console.log('ENCENDIENDO WEBHOOKS DE INSTAGRAM PARA PÁGINAS ACTIVAS');
  console.log('===========================================================\n');

  const { data: pages } = await supabase.from('connected_pages').select('*');

  // Solo páginas que tienen un instagram_account_id vinculado
  const igPages = pages.filter(p => p.access_token && p.instagram_account_id);
  
  if (igPages.length === 0) {
    console.log('No se encontraron Fan Pages con cuentas de Instagram vinculadas.');
    return;
  }

  for (const page of igPages) {
    console.log(`📱 Intentando activar Instagram Webhooks para: ${page.page_name} (IG ID: ${page.instagram_account_id})`);
    
    // Para Instagram, la suscripción se hace sobre el ID de la Página de Facebook pero con los campos de IG
    const res = await callGraph(`/${page.page_id}/subscribed_apps?subscribed_fields=instagram_manage_comments,instagram_manage_messages&access_token=${page.access_token}`);
    
    if (res.status === 200 && res.data.success) {
      console.log(`   ✅ ¡Instagram ACTIVADO con éxito!`);
    } else {
      console.log(`   ❌ Error al activar Instagram:`, JSON.stringify(res.data));
    }
    console.log('-----------------------------------------------------------');
  }
}

main();
