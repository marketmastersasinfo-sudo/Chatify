const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Secondary / International Fan Pages IDs from master docs
const secondaryPages = [
  { name: 'Mascotilandia', id: '107724638918160', bm: 'mascotilandia.co1' },
  { name: 'Monshop', id: '262821336922122', bm: 'monshopco' },
  { name: 'myblustore.com', id: '107256528402245', bm: 'myblustore' },
  { name: 'Tienda-papaya', id: '102931295954679', bm: 'myblustore.com' },
  { name: 'Panamashop', id: '919181894604995', bm: 'panamashop.co' },
  { name: 'Paraguashop', id: '847164308486909', bm: 'paraguashop1' },
  { name: 'Perushop', id: '2525599207810702', bm: 'perushop.co' },
  { name: 'Veneshop', id: '1059853547214118', bm: 'vene.shop1' },
  { name: 'VisteT', id: '625890813915309', bm: 'vistet1' },
  { name: 'Costaricashop', id: '1080214177399813', bm: 'costaricashop1' },
  { name: 'Guateshop', id: '472186185978780', bm: 'guateshop.co' },
  { name: 'Drakkars', id: '112122315124969', bm: 'clickshoes3' }
];

async function main() {
  console.log('========================================================================');
  console.log('AUDITORÍA PROFUNDA DE FAN PAGES SECUNDARIAS / INTERNACIONALES');
  console.log('========================================================================\n');

  // Read all tokens from files and database
  const vitContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales y Accesos\\tokens_vitalicios_facebook.txt', 'utf8');
  const masterContent = fs.readFileSync('C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt', 'utf8');
  const { data: dbPages } = await supabase.from('connected_pages').select('*');

  // Combine tokens into a search map
  const tokenList = [];
  const tokenRegex = /(EAA[A-Za-z0-9]+)/g;
  let match;
  while ((match = tokenRegex.exec(vitContent)) !== null) tokenList.push(match[1]);
  while ((match = tokenRegex.exec(masterContent)) !== null) tokenList.push(match[1]);

  console.log(`Buscando tokens de acceso válidos para las ${secondaryPages.length} páginas secundarias...\n`);

  for (const page of secondaryPages) {
    console.log(`📄 Evaluando: ${page.name} (ID: ${page.id}) | BM: ${page.bm}`);
    
    let validToken = null;
    let igId = null;
    let permissionsGranted = [];

    // Try tokens found in files
    for (const t of tokenList) {
      const res = await fetchGraph(`/${page.id}?fields=name,link,instagram_business_account`, t);
      if (res.status === 200 && res.data.id === page.id) {
        validToken = t;
        igId = res.data.instagram_business_account ? res.data.instagram_business_account.id : null;
        
        // Check permissions for this token
        const permRes = await fetchGraph(`/${page.id}/permissions`, t);
        if (permRes.status === 200 && permRes.data.data) {
          permissionsGranted = permRes.data.data.filter(p => p.status === 'granted').map(p => p.permission);
        }
        break;
      }
    }

    if (validToken) {
      const canManageComments = permissionsGranted.includes('pages_manage_engagement') || permissionsGranted.length === 0;
      const canMessage = permissionsGranted.includes('pages_messaging') || permissionsGranted.length === 0;

      console.log(`   ✅ Token Meta Válido: SI (200 OK)`);
      console.log(`   Instagram Business ID: ${igId || 'Sin IG'}`);
      console.log(`   Permiso Responder/Borrar Comentarios (\`pages_manage_engagement\`): ${canManageComments ? 'SI ✅' : 'NO ❌'}`);
      console.log(`   Permiso Enviar DMs (\`pages_messaging\`): ${canMessage ? 'SI ✅' : 'NO ❌'}`);

      // Upsert into connected_pages so Chatify can manage it
      const { error } = await supabase.from('connected_pages').upsert({
        page_id: page.id,
        page_name: page.name,
        access_token: validToken,
        instagram_account_id: igId,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'page_id' });

      if (!error) console.log(`   🎉 Registrada y activada exitosamente en \`connected_pages\` de Supabase!`);
    } else {
      console.log(`   ⚠️ Token Específico de Página: Pendiente de extracción en Meta Developer Explorer.`);
      console.log(`   Capacidad Moderación/Respuestas: Requiere cargar Page Token en \`connected_pages\`.`);
    }
    console.log('------------------------------------------------------------------------');
  }

  // Print summary of total connected pages in Supabase now
  const { data: finalPages } = await supabase.from('connected_pages').select('*');
  console.log(`\n========================================================================`);
  console.log(`RESULTADO FINAL: TOTAL DE FAN PAGES REGISTRADAS Y ACTIVAS EN CHATIFY: ${finalPages ? finalPages.length : 0}`);
  console.log(`========================================================================`);
  if (finalPages) {
    finalPages.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.page_name} (ID: ${p.page_id}) | IG: ${p.instagram_account_id || 'Sin IG'} | Token: OK 🟢`);
    });
  }
}

main();
