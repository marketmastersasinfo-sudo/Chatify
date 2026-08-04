const https = require('https');

const tokens = [
  { name: 'TiendaPapaya', token: 'EAAH5fjPTu2gBRw6hvI0m8ZCe25hTtVaIWY08fEwTejH4du0F42XUnfVSRCtxXRZBjZAlrp0TI597oifZAOudUdcFose5ng0AfekZASkYZAB3q4J8BfpjvwQ2g0LJYmLjwBptm9DCJSry2ZCkBH3QR0oko00wUGGv0axSnR8Oaxp5s9LwYMZAcTKH5ghBIhZC97KfXJQZDZD' },
  { name: 'Uwashop', token: 'EAAZAHP5ZBukPIBR8cBHUAoiMJYjgsfcq7bMOspZCBzbYGWndUE667IcZAYHH6nXU6bkNfDC0EX4uCo2DH6dQdvm9wZCWMo3qz5IX29Kj6ekOxnisFLow2HYCBCNm8Gnv0uVeTmk4YDfkryrEGF4PLJNGA0ZBZCfRHYDJuIuSracAdG4PfMoytAzPoV2oprU12ErXgZDZD' },
  { name: 'Yacompro', token: 'EAAWY72qnprsBRxZC8ZAn0VHy6vhQgWXMhDedANEG94T9MLnEsOxHDZAf6mT2Lg6sXhrBaEunoGwKKut8DbR2FYcCUCBRCTCc0taxfh0z98saM4EzkONXPJGwlplDPBYgRHuvWStLvPArDpHZAZCUL5Vx1YTcHZAPHtfupFrvL9r0dNUZB5CzRC0F2oYPx9NEjsNWgZDZD' },
  { name: 'Yaencasa', token: 'EAAPGW3LAqM8BR699AyppKxO9D1Ejw71NV3Q9uXQhVdZBE97wRedU4VGwq7Bevto1rGacewvkI1F2SpRfBxEiCZARTFlyOZC1AZAMxZCSWLdidPRuJmZAYEc3iEulbmOSrPRuB470dvnmszZAPECZAZB7tJExadBFkIEi6323VL5DZC7vmChY3rreosPXHNfQeDjlPKAwZDZD' },
  { name: 'comprasenunclickco', token: 'EAAWaEsDhJWIBR1wlXRkx4QpnWeOyERd48Sqw9mHA4pmZB7ajZB9Ji8UVPEB3a4UlguUP0jDrQUCyzvpyMLmpxbvDsWZBwPu0IroxlLOcSF56ht7cXbKJTYcPrnzZAORqo5H7l9EmZCNl8Eyu6LTsDzZCJKQYpKfI76oF1GWVu6pErHnaWfbD1BwkYoHrC2MZAvXwAZDZD' },
  { name: 'ecuashop.co1', token: 'EAAOSZBWctFF8BR4a6K8sBN5i3eueeLuGCfrR207MTJ4mNB6ZBcri1NuDjFIP7EtFG3owFy6up6ToEPj53Ca2pkTT7aD8VQB6yrZBOp4EEpfkzxcFsw7hJPDQiZBQeMIUdRRgNOl0p4m5UTYwcAZBdATNWR9MFUsZCJoJlodK2jPgt9VRirhoxnjAltEqzZCGXKcVgZDZD' },
  { name: 'Yaencasa NPG', token: 'EAAG82QbCdU4BRySTOtulmsatpBRfYUXdkFb7iRumBE27WVlzwV3Wny8mwmNbGV5SafsdmBbGBqB5F3N0vOjDGJyyLHzMXTfrtMBRKAIhyiBcvvgWV8OFZBQktY5COyWoIilVpNGmHogbP8SMCX7Kd3MCaZAkhq6KwyKfDwEho8SbQgsRyx9VdWjOmcW8IuKgZDZD' }
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
  console.log('===============================================================');
  console.log('EXTRAYENDO FAN PAGES DE LUZ ANGELA USANDO TOKENS DE BM');
  console.log('===============================================================\n');

  const pageMap = new Map();

  for (const item of tokens) {
    const res = await fetchGraph('/me/accounts?fields=id,name,category,access_token,instagram_business_account', item.token);
    if (res.status === 200 && res.data.data) {
      for (const p of res.data.data) {
        if (!pageMap.has(p.id)) {
          pageMap.set(p.id, {
            id: p.id,
            name: p.name,
            access_token: p.access_token,
            category: p.category,
            ig: p.instagram_business_account ? p.instagram_business_account.id : null,
            fromBM: item.name
          });
        }
      }
    } else {
      console.log(`⚠️ BM ${item.name} /me/accounts error (${res.status}): ${res.data?.error?.message}`);
    }
  }

  console.log(`\n🎉 Total Fan Pages encontradas: ${pageMap.size}\n`);

  for (const [id, p] of pageMap.entries()) {
    console.log(`📄 Fan Page: ${p.name}`);
    console.log(`   Page ID: ${p.id}`);
    console.log(`   Categoría: ${p.category || 'N/A'}`);
    console.log(`   Origen BM: ${p.fromBM}`);
    console.log(`   Instagram Business Vinculado: ${p.ig ? 'SÍ (' + p.ig + ')' : 'NO ❌'}`);
    console.log(`   Page Access Token: ${p.access_token ? 'SÍ (' + p.access_token.substring(0, 15) + '...)' : 'NO'}`);
    console.log('---------------------------------------------------------------');
  }
}

main();
