const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Ver los IDs de las tiendas que acabamos de crear
  const { data: stores, error: storeError } = await supabase
    .from('stores')
    .select('id, name, meta_phone_number_id, meta_waba_id, meta_wa_active')
    .in('name', ['Lacompracion', 'DLP', 'Mundo Compra']);
    
  if (storeError) console.error("Store error:", storeError);
  else {
    console.log("=== TIENDAS CREADAS ===");
    stores.forEach(s => console.log(`${s.name} -> ID: ${s.id} | WA Active: ${s.meta_wa_active}`));
  }

  // 2. Ver los leads recientes y a qué store_id apuntan
  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('id, name, phone, store_id, board_type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (leadError) console.error("Lead error:", leadError);
  else {
    console.log("\n=== LEADS RECIENTES ===");
    leads.forEach(l => console.log(`${l.name} | Phone: ${l.phone} | Store ID: ${l.store_id} | Board: ${l.board_type} | Status: ${l.status} | Created: ${l.created_at}`));
  }

  // 3. Cruzar: ¿Los store_id de los leads coinciden con nuestras tiendas?
  if (stores && leads) {
    const storeIds = stores.map(s => s.id);
    const matchingLeads = leads.filter(l => storeIds.includes(l.store_id));
    const orphanLeads = leads.filter(l => !storeIds.includes(l.store_id));
    
    console.log("\n=== DIAGNÓSTICO ===");
    console.log(`Leads que SÍ apuntan a nuestras tiendas: ${matchingLeads.length}`);
    console.log(`Leads HUÉRFANOS (apuntan a otra tienda): ${orphanLeads.length}`);
    orphanLeads.forEach(l => console.log(`  -> ${l.name} apunta a store_id: ${l.store_id}`));
  }
}

main();
