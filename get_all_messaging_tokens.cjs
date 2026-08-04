const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

function fetchGraph(path) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v20.0${path}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    }).on('error', (err) => resolve({ status: 500, error: err.message }));
  });
}

async function main() {
  console.log('===========================================================');
  console.log('OBTENIENDO PAGE TOKENS CON PERMISO pages_messaging (TOKEN #11)');
  console.log('===========================================================\n');

  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');
  const tokenMatch = masterContent.match(/(EAAH5fjPTu2gBR[A-Za-z0-9]+)/);
  if (!tokenMatch) {
    console.log('Token EAAH5fjPTu2gBR no encontrado');
    return;
  }
  const token11 = tokenMatch[1];

  // Fetch /me/accounts using Token #11
  const res = await fetchGraph(`/me/accounts?limit=100&access_token=${token11}`);
  if (res.status === 200 && res.data.data) {
    console.log(`Encontradas ${res.data.data.length} páginas administradas por Token #11:\n`);
    for (const page of res.data.data) {
      console.log(`📄 ${page.name} (ID: ${page.id}) | Access Token: ${page.access_token.slice(0, 20)}...`);
      
      // Update connected_pages in Supabase with this token containing pages_messaging scope
      await supabase.from('connected_pages').update({
        access_token: page.access_token
      }).eq('page_id', page.id);
    }
    console.log('\n✅ ¡Tokens con `pages_messaging` actualizados en Supabase para las Fan Pages!');
  } else {
    console.log('Error obteniendo /me/accounts:', JSON.stringify(res.data));
  }
}

main();
