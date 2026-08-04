const { createClient } = require('@supabase/supabase-js');
const https = require('https');

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
  console.log('PROBANDO ENVÍO DIRECTO DE PRIVADO (DM) VÍA META GRAPH API');
  console.log('===========================================================\n');

  const { data: page } = await supabase
    .from('connected_pages')
    .select('*')
    .eq('page_id', '113460161573247')
    .single();

  const commentId = '114423348160654_1266004532146406';

  console.log(`Página: ${page.page_name}`);
  console.log(`Enviando DM privado al comentario ID: ${commentId}...`);

  const dmPayload = {
    recipient: { comment_id: commentId },
    message: { text: "¡Hola Paula! Te saludamos de Ofertazo.co. El precio especial de hoy es $89.900 con envío gratis. ¿Te gustaría realizar el pedido?" }
  };

  const res = await callGraph(`/${page.page_id}/messages?access_token=${page.access_token}`, 'POST', dmPayload);
  console.log('\nRespuesta de Meta Graph API al enviar DM Privado:');
  console.log(JSON.stringify(res, null, 2));
}

main();
