const https = require('https');

const tokens = [
  { name: 'TiendaPapaya Social Token', token: 'EAAH5fjPTu2gBRw6hvI0m8ZCe25hTtVaIWY08fEwTejH4du0F42XUnfVSRCtxXRZBjZAlrp0TI597oifZAOudUdcFose5ng0AfekZASkYZAB3q4J8BfpjvwQ2g0LJYmLjwBptm9DCJSry2ZCkBH3QR0oko00wUGGv0axSnR8Oaxp5s9LwYMZAcTKH5ghBIhZC97KfXJQZDZD' },
  { name: 'Uwashop Social Token', token: 'EAAZAHP5ZBukPIBR8cBHUAoiMJYjgsfcq7bMOspZCBzbYGWndUE667IcZAYHH6nXU6bkNfDC0EX4uCo2DH6dQdvm9wZCWMo3qz5IX29Kj6ekOxnisFLow2HYCBCNm8Gnv0uVeTmk4YDfkryrEGF4PLJNGA0ZBZCfRHYDJuIuSracAdG4PfMoytAzPoV2oprU12ErXgZDZD' },
  { name: 'Yacompro Social Token', token: 'EAAWY72qnprsBRxZC8ZAn0VHy6vhQgWXMhDedANEG94T9MLnEsOxHDZAf6mT2Lg6sXhrBaEunoGwKKut8DbR2FYcCUCBRCTCc0taxfh0z98saM4EzkONXPJGwlplDPBYgRHuvWStLvPArDpHZAZCUL5Vx1YTcHZAPHtfupFrvL9r0dNUZB5CzRC0F2oYPx9NEjsNWgZDZD' },
  { name: 'Yaencasa Social Token', token: 'EAAPGW3LAqM8BR699AyppKxO9D1Ejw71NV3Q9uXQhVdZBE97wRedU4VGwq7Bevto1rGacewvkI1F2SpRfBxEiCZARTFlyOZC1AZAMxZCSWLdidPRuJmZAYEc3iEulbmOSrPRuB470dvnmszZAPECZAZB7tJExadBFkIEi6323VL5DZC7vmChY3rreosPXHNfQeDjlPKAwZDZD' },
  { name: 'comprasenunclickco Social Token', token: 'EAAWaEsDhJWIBR1wlXRkx4QpnWeOyERd48Sqw9mHA4pmZB7ajZB9Ji8UVPEB3a4UlguUP0jDrQUCyzvpyMLmpxbvDsWZBwPu0IroxlLOcSF56ht7cXbKJTYcPrnzZAORqo5H7l9EmZCNl8Eyu6LTsDzZCJKQYpKfI76oF1GWVu6pErHnaWfbD1BwkYoHrC2MZAvXwAZDZD' },
  { name: 'ecuashop.co1 Social Token', token: 'EAAOSZBWctFF8BR4a6K8sBN5i3eueeLuGCfrR207MTJ4mNB6ZBcri1NuDjFIP7EtFG3owFy6up6ToEPj53Ca2pkTT7aD8VQB6yrZBOp4EEpfkzxcFsw7hJPDQiZBQeMIUdRRgNOl0p4m5UTYwcAZBdATNWR9MFUsZCJoJlodK2jPgt9VRirhoxnjAltEqzZCGXKcVgZDZD' },
  { name: 'Mundo Compra Social Token (Paula)', token: 'EAAa44lUrYZBIBR1Dp7FPFTZC1WwQrlH1l5iQxZCbeMWH2CEbnx67wDTICuKe9ay4cxRaVhkGc9KptaOK4bt296TmOI1Q1cD7WZCYYxIizzoxlPcZBrjFW8Gfh2NSfjH2G7LIu8vgkesPJ4w58XR8GR7IBnKxwEy1488dzCWWris7FS9fc2rYLFJL3CwdfZAmk4QQZDZD' },
  { name: 'TupromoStore Social Token (Paula)', token: 'EAAKuswVq7xABRwG1GRICq7eIRJKOR4ZA7dLMIvCYZAgGgEYzU7I1FrGwrZApuVO0iijSA5s5GqAHXiRByCfnHkOK6aDL0RLC6Uj0qw4ZBS9BZBAtUjgwlYjPV7ZAZCawgQ2AHGL3W5tFsZB0PQ9rQjd1ZCZCS5P0AftO29PvizpCgYbaQStrkdZAajJX2lJbem3S9Dp0QZDZD' }
];

const appId = '1557352869138074';
const appSecret = '205c13a8770e0eb5ff496afd4b5de88d';

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
    }).on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });
  });
}

async function main() {
  console.log('========================================================================');
  console.log('AUDITORÍA DE TOKENS DE REDES SOCIALES (SYSTEM USER TOKENS)');
  console.log('========================================================================\n');

  for (const item of tokens) {
    console.log(`🔑 Probando token: ${item.name}...`);
    // Debug token endpoint
    const debugRes = await fetchGraph(`/debug_token?input_token=${item.token}&access_token=${appId}|${appSecret}`);
    
    if (debugRes.status === 200 && debugRes.data.data) {
      const d = debugRes.data.data;
      console.log(`   ✅ Token Válido: SI`);
      console.log(`   App ID: ${d.app_id}`);
      console.log(`   Type: ${d.type}`);
      console.log(`   Is Valid: ${d.is_valid}`);
      console.log(`   Scopes/Permisos: ${d.scopes ? d.scopes.join(', ') : 'Ninguno'}`);
      console.log(`   Granular Scopes: ${d.granular_scopes ? JSON.stringify(d.granular_scopes) : 'N/A'}`);
    } else {
      console.log(`   ❌ Error debug token (${debugRes.status}): ${debugRes.data?.error?.message || JSON.stringify(debugRes.data)}`);
    }
    console.log('------------------------------------------------------------------------');
  }
}

main();
