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
  // Step 1: Exchange for long-lived token
  console.log('1. Intercambiando por token de larga duración...');
  const url1 = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
  const tokenData = await httpsGet(url1);
  
  if (tokenData.error) {
    console.error('Error:', tokenData.error);
    return;
  }
  
  const longToken = tokenData.access_token;
  console.log('✅ Token largo obtenido!\n');

  // Step 2: Fetch ALL pages with pagination
  let allPages = [];
  let url = `https://graph.facebook.com/v25.0/me/accounts?access_token=${longToken}&limit=200`;
  let pageNum = 1;
  
  while (url) {
    console.log(`Cargando página ${pageNum} de resultados...`);
    const result = await httpsGet(url);
    
    if (result.error) {
      console.error('Error:', result.error);
      break;
    }
    
    if (result.data) {
      allPages = allPages.concat(result.data);
    }
    
    url = result.paging?.next || null;
    pageNum++;
  }

  // Step 3: Show results
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  TOTAL FAN PAGES ENCONTRADAS: ${allPages.length}`);
  console.log(`${'='.repeat(50)}\n`);
  
  allPages.forEach((p, i) => {
    console.log(`${i+1}. ${p.name}`);
    console.log(`   Page ID: ${p.id}`);
    console.log(`   Token: ${p.access_token.substring(0, 30)}...`);
    console.log('');
  });
}

main().catch(console.error);
