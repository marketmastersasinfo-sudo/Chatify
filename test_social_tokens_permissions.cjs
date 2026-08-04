const https = require('https');

const tokens = [
  { name: 'TiendaPapaya Social Token', token: 'EAAH5fjPTu2gBRw6hvI0m8ZCe25hTtVaIWY08fEwTejH4du0F42XUnfVSRCtxXRZBjZAlrp0TI597oifZAOudUdcFose5ng0AfekZASkYZAB3q4J8BfpjvwQ2g0LJYmLjwBptm9DCJSry2ZCkBH3QR0oko00wUGGv0axSnR8Oaxp5s9LwYMZAcTKH5ghBIhZC97KfXJQZDZD' },
  { name: 'Uwashop Social Token', token: 'EAAZAHP5ZBukPIBR8cBHUAoiMJYjgsfcq7bMOspZCBzbYGWndUE667IcZAYHH6nXU6bkNfDC0EX4uCo2DH6dQdvm9wZCWMo3qz5IX29Kj6ekOxnisFLow2HYCBCNm8Gnv0uVeTmk4YDfkryrEGF4PLJNGA0ZBZCfRHYDJuIuSracAdG4PfMoytAzPoV2oprU12ErXgZDZD' },
  { name: 'Yacompro Social Token', token: 'EAAWY72qnprsBRxZC8ZAn0VHy6vhQgWXMhDedANEG94T9MLnEsOxHDZAf6mT2Lg6sXhrBaEunoGwKKut8DbR2FYcCUCBRCTCc0taxfh0z98saM4EzkONXPJGwlplDPBYgRHuvWStLvPArDpHZAZCUL5Vx1YTcHZAPHtfupFrvL9r0dNUZB5CzRC0F2oYPx9NEjsNWgZDZD' },
  { name: 'Yaencasa Social Token', token: 'EAAPGW3LAqM8BR699AyppKxO9D1Ejw71NV3Q9uXQhVdZBE97wRedU4VGwq7Bevto1rGacewvkI1F2SpRfBxEiCZARTFlyOZC1AZAMxZCSWLdidPRuJmZAYEc3iEulbmOSrPRuB470dvnmszZAPECZAZB7tJExadBFkIEi6323VL5DZC7vmChY3rreosPXHNfQeDjlPKAwZDZD' },
  { name: 'ecuashop.co1 Social Token', token: 'EAAOSZBWctFF8BR4a6K8sBN5i3eueeLuGCfrR207MTJ4mNB6ZBcri1NuDjFIP7EtFG3owFy6up6ToEPj53Ca2pkTT7aD8VQB6yrZBOp4EEpfkzxcFsw7hJPDQiZBQeMIUdRRgNOl0p4m5UTYwcAZBdATNWR9MFUsZCJoJlodK2jPgt9VRirhoxnjAltEqzZCGXKcVgZDZD' },
  { name: 'Mundo Compra Social Token (Paula)', token: 'EAAa44lUrYZBIBR1Dp7FPFTZC1WwQrlH1l5iQxZCbeMWH2CEbnx67wDTICuKe9ay4cxRaVhkGc9KptaOK4bt296TmOI1Q1cD7WZCYYxIizzoxlPcZBrjFW8Gfh2NSfjH2G7LIu8vgkesPJ4w58XR8GR7IBnKxwEy1488dzCWWris7FS9fc2rYLFJL3CwdfZAmk4QQZDZD' },
  { name: 'TupromoStore Social Token (Paula)', token: 'EAAKuswVq7xABRwG1GRICq7eIRJKOR4ZA7dLMIvCYZAgGgEYzU7I1FrGwrZApuVO0iijSA5s5GqAHXiRByCfnHkOK6aDL0RLC6Uj0qw4ZBS9BZBAtUjgwlYjPV7ZAZCawgQ2AHGL3W5tFsZB0PQ9rQjd1ZCZCS5P0AftO29PvizpCgYbaQStrkdZAajJX2lJbem3S9Dp0QZDZD' }
];

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
    }).on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });
  });
}

async function main() {
  console.log('========================================================================');
  console.log('AUDITORÍA DIRECTA DE PERMISOS DE TOKENS SOCIALES');
  console.log('========================================================================\n');

  for (const item of tokens) {
    console.log(`🔑 Token: ${item.name}`);
    const res = await fetchGraph('/me/permissions', item.token);
    if (res.status === 200 && res.data.data) {
      const granted = res.data.data.filter(p => p.status === 'granted').map(p => p.permission);
      console.log(`   ✅ Status 200 OK. Permisos otorgados (${granted.length}): ${granted.join(', ')}`);
    } else {
      console.log(`   ❌ Error ${res.status}: ${res.data?.error?.message || JSON.stringify(res.data)}`);
    }
    console.log('------------------------------------------------------------------------');
  }
}

main();
