const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: numbers } = await supabase.from('whatsapp_numbers').select('*').order('business_manager');

  let doc = `=====================================================================\n`;
  doc += `   DOCUMENTO MAESTRO DE CREDENCIALES WHATSAPP META - CHATIFY\n`;
  doc += `   Última actualización: 22 de Julio de 2026\n`;
  doc += `=====================================================================\n\n`;

  doc += `--- 🅰️ PERFIL DE FACEBOOK: LUZ ANGELA ---\n\n`;
  const luz = numbers.filter(n => n.business_manager && n.business_manager.includes('Luz Angela'));
  luz.forEach((n, idx) => {
    doc += `${idx + 1}. TIENDA / BM: ${n.business_manager}\n`;
    doc += `   - Número Display: ${n.display_name} (${n.phone_number})\n`;
    doc += `   - Phone Number ID: ${n.phone_number_id}\n`;
    doc += `   - WABA ID: ${n.waba_id}\n`;
    doc += `   - Access Token: ${n.access_token}\n\n`;
  });

  doc += `--- 🅱️ PERFIL DE FACEBOOK: PAULA ---\n\n`;
  const paula = numbers.filter(n => n.business_manager && n.business_manager.includes('Paula'));
  paula.forEach((n, idx) => {
    doc += `${idx + 1}. TIENDA / BM: ${n.business_manager}\n`;
    doc += `   - Número Display: ${n.display_name} (${n.phone_number})\n`;
    doc += `   - Phone Number ID: ${n.phone_number_id}\n`;
    doc += `   - WABA ID: ${n.waba_id}\n`;
    doc += `   - Access Token: ${n.access_token}\n\n`;
  });

  const path1 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\credenciales_meta_master.txt';
  fs.writeFileSync(path1, doc, 'utf8');
  console.log(`✅ Creado documento de credenciales en: ${path1}`);
}

main();
