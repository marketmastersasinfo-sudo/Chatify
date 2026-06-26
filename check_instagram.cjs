const https = require('https');

const appId = '1557352869138074';
const appSecret = '205c13a8770e0eb5ff496afd4b5de88d';
const shortToken = 'EAAWIZA3iODpoBRZBp2cMKuUScUmK37Nm8NapLZBN1akoVZAJEsmaBeSmtZCxx1Ea5UvTaAK5uGZAvLHOWNDpNhOY3YpkGcmjZBNawuaZCrLoLIEFum4BBRfT6BSkZCZCm7REZBBgHCTFcvAKewJtkEPfZArALJAbY1VxkeAmR0AjcKHvH5wvR3gmwvgpa7HFMxbCsdyoJjDZBqWYIxyDhHfJe5ltUk7HvIBtgiBgkLVnqbVhadx6yed8JZBr4PfW4zRLEplBbKbwBX5OAy03fw2F0ZD';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  // Step 1: Get long-lived token
  const tokenData = await httpsGet(`https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`);
  if (tokenData.error) { console.error('Error:', tokenData.error); return; }
  const longToken = tokenData.access_token;

  // Step 2: Get all pages
  const pagesData = await httpsGet(`https://graph.facebook.com/v25.0/me/accounts?access_token=${longToken}&limit=200`);
  const pages = pagesData.data || [];

  console.log(`\n${'='.repeat(60)}`);
  console.log('  FAN PAGES + INSTAGRAM CONECTADO');
  console.log(`${'='.repeat(60)}\n`);

  for (const page of pages) {
    // Check for Instagram Business Account
    const igData = await httpsGet(`https://graph.facebook.com/v25.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
    
    const igId = igData.instagram_business_account?.id || null;
    let igName = 'N/A';
    
    if (igId) {
      const igInfo = await httpsGet(`https://graph.facebook.com/v25.0/${igId}?fields=username,name&access_token=${page.access_token}`);
      igName = igInfo.username || igInfo.name || igId;
    }

    console.log(`📘 ${page.name} (${page.id})`);
    if (igId) {
      console.log(`   📸 Instagram: @${igName} (ID: ${igId})`);
    } else {
      console.log(`   ❌ Sin Instagram conectado`);
    }
    console.log('');
  }
}

main().catch(console.error);
