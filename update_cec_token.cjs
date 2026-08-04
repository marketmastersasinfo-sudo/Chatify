const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

const newToken = 'EAAWaEsDhjWIBSKPozNBQ7SBnvcli2wyJOI56LwH6ptXqEZCUpY5RyR67AfQFFMKJ1TBu5Nxl7ZBWjZCocVLp3WEuFOqZACH2ZCQYv3uGSYWDfHkfd3v3Ump658PHTUjs9HZCVrPABZCmrlkZCMOLW7RZCT9zE8CQvMK1XmV8w9QXqiF7VN7bl9umMvme9RwcAgx1cIAZDZD';

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
  console.log('🔄 Actualizando token de ComprasYa / Compras en un click en Supabase...');

  // 1. Update stores table
  const { error: errStore } = await supabase
    .from('stores')
    .update({ meta_access_token: newToken })
    .eq('name', 'ComprasYa');

  if (errStore) console.error('Error actualizando stores:', errStore);
  else console.log('✅ Tabla `stores` actualizada para ComprasYa.');

  // 2. Update whatsapp_numbers table
  const { error: errWa } = await supabase
    .from('whatsapp_numbers')
    .update({ access_token: newToken })
    .eq('display_name', 'Compras en un click');

  if (errWa) console.error('Error actualizando whatsapp_numbers:', errWa);
  else console.log('✅ Tabla `whatsapp_numbers` actualizada para Compras en un click.');

  // 3. Probar conexión Meta API con el nuevo token
  const wabaId = '521462044386660';
  console.log(`\n🧪 Probando conexión Meta API para ComprasYa (WABA: ${wabaId})...`);
  const metaRes = await fetchGraph(`/${wabaId}/message_templates?limit=100`, newToken);
  
  if (metaRes.status === 200) {
    const templates = metaRes.data.data || [];
    const approved = templates.filter(t => t.status === 'APPROVED');
    console.log(`🎉 ¡ÉXITO TOTAL! Conexión Meta 200 OK. Encontradas ${templates.length} plantillas (${approved.length} APROBADAS).`);
    
    // Import approved templates into store_templates for ComprasYa
    const { data: storeData } = await supabase.from('stores').select('id').eq('name', 'ComprasYa').single();
    if (storeData) {
      let count = 0;
      for (const t of approved) {
        const { error } = await supabase.from('store_templates').upsert({
          store_id: storeData.id,
          template_name: t.name,
          template_type: t.name.includes('confirm') ? 'order_confirmation' : (t.name.includes('cart') || t.name.includes('carrito') ? 'abandoned_cart' : 'custom'),
          is_active: true
        }, { onConflict: 'store_id,template_name' });
        if (!error) count++;
      }
      console.log(`✅ Sincronizadas ${count} plantillas aprobadas en Supabase para ComprasYa.`);
    }
  } else {
    console.error('❌ Error Meta API:', metaRes.data);
  }

  // 4. Update secrets.txt and local secrets file
  const secretsPath = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\secrets.txt';
  let secretsContent = '';
  if (fs.existsSync(secretsPath)) {
    secretsContent = fs.readFileSync(secretsPath, 'utf8');
  }
  secretsContent += `\n# ComprasYa / CEC Token - Actualizado 22 de Julio 2026\nCOMPRAS_YA_META_TOKEN=${newToken}\n`;
  fs.writeFileSync(secretsPath, secretsContent, 'utf8');
  console.log('✅ Token guardado en secrets.txt');
}

main();
