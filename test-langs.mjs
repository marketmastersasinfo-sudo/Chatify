import fetch from 'node-fetch';

const url = 'https://graph.facebook.com/v25.0/723025644229688/messages';
const token = 'EAAH5fjPTu2gBRw6hvI0m8ZCe25hTtVaIWY08fEwTejH4du0F42XUnfVSRCtxXRZBjZAlrp0TI597oifZAOudUdcFose5ng0AfekZASkYZAB3q4J8BfpjvwQ2g0LJYmLjwBptm9DCJSry2ZCkBH3QR0oko00wUGGv0axSnR8Oaxp5s9LwYMZAcTKH5ghBIhZC97KfXJQZDZD';

async function tryLang(lang) {
  const body = {
    messaging_product: 'whatsapp',
    to: '573182533893',
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: lang }
    }
  };

  console.log(`Trying ${lang}...`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  console.log(`Result for ${lang}:`, data);
}

async function main() {
  await tryLang('es');
  await tryLang('es_LA');
  await tryLang('es_CO');
  await tryLang('en_US');
}

main();
