const https = require('https');
const fs = require('fs');

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
  console.log('PROBANDO DM CON CADA PAGE TOKEN VITALICIO DE Ofertazo.co');
  console.log('===========================================================\n');

  const vitContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');
  const tokenRegex = /(EAA[A-Za-z0-9]+)/g;
  const tokenList = [];
  let match;
  while ((match = tokenRegex.exec(vitContent)) !== null) tokenList.push(match[1]);

  const pageId = '113460161573247';
  const commentId = '114423348160654_1266004532146406';

  for (let i = 0; i < tokenList.length; i++) {
    const t = tokenList[i];
    const dmPayload = {
      recipient: { comment_id: commentId },
      message: { text: "¡Hola Paula! Prueba de envío de mensaje privado desde Ofertazo.co." }
    };
    const res = await callGraph(`/${pageId}/messages?access_token=${t}`, 'POST', dmPayload);
    if (res.status === 200 && res.data.message_id) {
      console.log(`🎉 ¡TOKEN #${i+1} ENVIÓ EL DM PRIVADO CON ÉXITO! Message ID:`, res.data.message_id);
      break;
    } else {
      console.log(`Token #${i+1} status ${res.status}:`, res.data.error?.message || res.data.error);
    }
  }
}

main();
