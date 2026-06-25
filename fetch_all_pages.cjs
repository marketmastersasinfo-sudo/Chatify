const https = require('https');

const appId = '1557352869138074';
const appSecret = '205c13a8770e0eb5ff496afd4b5de88d';
const shortToken = 'EAAWIZA3iODpoBR5ctA7HNmt5QHwfSHPLi174xP3wZBkVuQJD55ZBS4MirNqt9Aea0oRqeUTwwtvlxXDEMOUBKDp3blZCKCV8jJsERB8ZCL34knAg2r3Ic2zf0dyMrcAtMcbITtWqxmR10MtBQJAsGYDI7a3iHwHx1hpIej4qZCCZC3Pmb4H87C2GcrhAmQPbIpgggB7aJjpikA0ZBYU9qugYabcRyiFUtuJmaDkwJC0iqG0qBOUv6TlhUt4hfyoMA4kBiHzhd9pE7ZBZAuVLYzbAZDZD';

const url1 = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;

https.get(url1, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    if (parsed.error) {
      console.error('Error getting long token:', parsed.error);
      return;
    }
    const longUserToken = parsed.access_token;
    console.log('Got Long User Token.');
    
    // Fetch pages
    const url2 = `https://graph.facebook.com/v19.0/me/accounts?access_token=${longUserToken}&limit=200`;
    https.get(url2, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const parsed2 = JSON.parse(data2);
        if (parsed2.error) {
          console.error('Error getting pages:', parsed2.error);
          return;
        }
        
        const pages = parsed2.data || [];
        console.log(`\n\n=== ENCONTRADAS ${pages.length} FAN PAGES ===\n`);
        pages.forEach(p => {
            console.log(`Tienda: ${p.name}`);
            console.log(`Page ID: ${p.id}`);
            console.log(`Token Vitalicio: ${p.access_token}`);
            console.log('-----------------------------------');
        });
      });
    });
  });
});
