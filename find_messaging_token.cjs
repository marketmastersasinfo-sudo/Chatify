const https = require('https');
const fs = require('fs');

function fetchGraph(path, token) {
  return new Promise((resolve) => {
    const sep = path.includes('?') ? '&' : '?';
    const url = `https://graph.facebook.com/v20.0${path}${sep}access_token=${token}`;
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
  console.log('BUSCANDO TOKEN CON PERMISO pages_messaging EN ARCHIVOS');
  console.log('===========================================================\n');

  const vitContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');
  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');

  const tokenRegex = /(EAA[A-Za-z0-9]+)/g;
  const tokenList = [];
  let match;
  while ((match = tokenRegex.exec(vitContent)) !== null) tokenList.push(match[1]);
  while ((match = tokenRegex.exec(masterContent)) !== null) tokenList.push(match[1]);

  console.log(`Evaluando ${tokenList.length} tokens extraídos...`);

  for (let i = 0; i < tokenList.length; i++) {
    const t = tokenList[i];
    const debugRes = await fetchGraph(`/debug_token?input_token=${t}`, t);
    if (debugRes.status === 200 && debugRes.data.data) {
      const perms = debugRes.data.data.scopes || [];
      const hasMessaging = perms.includes('pages_messaging');
      console.log(`Token #${i+1} (${t.slice(0, 15)}...): pages_messaging = ${hasMessaging ? '✅ SÍ' : '❌ NO'} | Scopes:`, perms.join(', '));
    }
  }
}

main();
