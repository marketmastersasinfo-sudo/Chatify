const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

function callGraph(path, method = 'POST', bodyData = null) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v19.0${path}`;
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
  console.log('PROBANDO ENVÍO DE DM CON EL TOKEN MASTER QUE TIENE pages_messaging');
  console.log('===========================================================\n');

  // Token #32 from master file (EAARFo1rsZCJcBR...)
  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');
  const match = masterContent.match(/(EAARFo1rsZCJcBR[A-Za-z0-9]+)/);

  if (!match) {
    console.log('Token EAARFo1rsZCJcBR no encontrado');
    return;
  }

  const masterToken = match[1];
  const pageId = '113460161573247';
  const commentId = '114423348160654_1266004532146406';

  // First get Page Access Token using Master Token
  const pageTokenRes = await new Promise(resolve => {
    https.get(`https://graph.facebook.com/v20.0/${pageId}?fields=access_token&access_token=${masterToken}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });

  console.log('Page Token obtenido con Token Master:', pageTokenRes.access_token ? 'SÍ ✅' : 'NO ❌');
  const validPageToken = pageTokenRes.access_token || masterToken;

  const dmPayload = {
    recipient: { comment_id: commentId },
    message: { text: "¡Hola Paula! Te saludamos de Ofertazo.co. El precio especial es $89.900 con envío gratis. ¿Te enviamos el catálogo completo?" }
  };

  const res = await callGraph(`/${pageId}/messages?access_token=${validPageToken}`, 'POST', dmPayload);
  console.log('\nRespuesta de Meta Graph API al enviar DM:');
  console.log(JSON.stringify(res, null, 2));

  if (res.status === 200 && res.data.message_id) {
    console.log('\n🎉 ¡DM PRIVADO ENVIADO EXITOSAMENTE AL MESSENGER DE PAULA ROJAS!');
    
    // Update connected_pages with the full permission token
    await supabase.from('connected_pages').update({ access_token: validPageToken }).eq('page_id', pageId);
    console.log('✅ Token con permiso `pages_messaging` actualizado en Supabase para Ofertazo.co!');
  }
}

main();
