const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

const GROUP1_PHONES = ['+573224092420', '+573112326199', '+573228629804', '+573123590791', '+573209768055'];
const GROUP2_PHONES = ['+57 300 9630919', '+573157003102', '+573133556020', '+573204527225', '+573212109697'];

const GROUP1_TEMPLATES = [
  { type: 'recuperar_carrito_t1', name: 'carrito_abandonado_inicial_utility_v1_con_imagen_optimizado' },
  { type: 'recuperar_carrito_t2', name: 'carrito_abandonado_recordatorio1_marketing_v1_optimizado' },
  { type: 'recuperar_carrito_t3', name: 'carrito_abandonado_recordatorio_final_marketing_v1_optimizado' },
  { type: 'order_confirmation', name: 'confirmacion_inicial_v1_optimizada' },
  { type: 'order_confirmation', name: 'confirmacion_seguimiento_30min_con_image_v1_optimizada' },
  { type: 'order_confirmation', name: 'confirmacion_seguimiento_4horas_v1_optimizado' }
];

const GROUP2_TEMPLATES = [
  { type: 'recuperar_carrito_t1', name: 'carrito_abandonado_inicial_utility_v1_texto' },
  { type: 'recuperar_carrito_t2', name: 'carrito_abandonado_recordatorio1_marketing_v1_optimizado' },
  { type: 'recuperar_carrito_t3', name: 'carrito_abandonado_recordatorio_final_marketing_v1_optimizado' },
  { type: 'order_confirmation', name: 'confirmacion_inicial_v1_optimizada' }
];

async function main() {
  const { data: numbers } = await supabase.from('whatsapp_numbers').select('store_id, phone_number, display_name');

  for (const num of numbers) {
    if (!num.store_id) continue;
    
    let templates = [];
    let cleanPhone = num.phone_number.replace(/\s+/g, ''); // Normalize phone string

    if (GROUP1_PHONES.some(p => p.replace(/\s+/g, '') === cleanPhone)) {
      templates = GROUP1_TEMPLATES;
    } else if (GROUP2_PHONES.some(p => p.replace(/\s+/g, '') === cleanPhone)) {
      templates = GROUP2_TEMPLATES;
    } else {
      continue;
    }

    console.log(`Seeding ${num.display_name} (${num.store_id}) with ${templates.length} templates...`);

    // Delete existing templates of these types to avoid duplicates
    await supabase.from('store_templates').delete().eq('store_id', num.store_id);

    // Insert new templates
    const toInsert = templates.map(t => ({
      store_id: num.store_id,
      template_name: t.name,
      template_type: t.type,
      is_active: true
    }));

    const { error } = await supabase.from('store_templates').insert(toInsert);
    if (error) {
      console.error(`Error seeding ${num.display_name}:`, error.message);
    } else {
      console.log(`✅ Success for ${num.display_name}`);
    }
  }
}

main();
