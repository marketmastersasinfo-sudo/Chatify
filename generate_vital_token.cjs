const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function generateVitalToken() {
  console.log('--- GENERADOR DE TOKEN VITALICIO (NUNCA EXPIRA) ---');
  console.log('Para usar esto, necesitas tu App ID y App Secret desde developers.facebook.com');
  
  const appId = await askQuestion('1. Ingresa tu App ID: ');
  const appSecret = await askQuestion('2. Ingresa tu App Secret: ');
  const shortLivedUserToken = await askQuestion('3. Ingresa tu Token Corto (El que sacaste del Graph API Explorer): ');

  console.log('\n⏳ Intercambiando con Facebook por un Token de Usuario de Larga Duración...');

  // 1. Obtener Token de Usuario de Larga Duración
  const url1 = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId.trim()}&client_secret=${appSecret.trim()}&fb_exchange_token=${shortLivedUserToken.trim()}`;

  https.get(url1, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      if (parsed.error) {
        console.error('❌ Error de Facebook:', parsed.error.message);
        rl.close();
        return;
      }

      const longLivedUserToken = parsed.access_token;
      console.log('✅ ¡Éxito! Token de Usuario de 60 Días obtenido.\n');
      console.log('⏳ Ahora extrayendo los Tokens Vitalicios de TUS PÁGINAS...');

      // 2. Obtener Tokens de Páginas (Vitalicios)
      const url2 = `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}`;
      
      https.get(url2, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          const parsed2 = JSON.parse(data2);
          if (parsed2.error) {
            console.error('❌ Error al obtener páginas:', parsed2.error.message);
            rl.close();
            return;
          }

          console.log('\n=========================================');
          console.log('🎉 TOKENS VITALICIOS GENERADOS (Guárdalos bien) 🎉');
          console.log('Estos tokens NUNCA EXPIRAN.');
          console.log('=========================================\n');

          const pages = parsed2.data || [];
          if (pages.length === 0) {
            console.log('⚠️ No se encontraron páginas asociadas a este perfil.');
          } else {
            pages.forEach(page => {
              console.log(`Tienda: ${page.name}`);
              console.log(`Page ID: ${page.id}`);
              console.log(`Token Vitalicio: ${page.access_token}`);
              console.log('-----------------------------------------');
            });
            console.log(`\n✅ Se mostraron ${pages.length} páginas.`);
          }
          
          rl.close();
        });
      }).on('error', err => {
        console.error('❌ Request error:', err);
        rl.close();
      });

    });
  }).on('error', err => {
    console.error('❌ Request error:', err);
    rl.close();
  });
}

generateVitalToken();
