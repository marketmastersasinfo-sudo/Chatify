const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const token = 'EAAa44lUrYZBIBRzW4WWUAjhC1Cjp51POwJqMEjf7lYziegac72KUCthi7656qLAw6qRu2pzMs9FSccmyS6suOIuD74qqulif8sekPYXVbjCkl7fef61UUQQpr0KRG1eLiWOEqqDnzwjIL2trOm2EnDSG7MqCEDW3eSrnVZBwb8uUZCGr0goOoAR9pDWDTidGgZDZD';
  
  const store = {
    name: 'Mundo Compra',
    waba_number: '+573009630919',
    meta_phone_number_id: '378073418733738',
    meta_waba_id: '426754590528254',
    meta_access_token: token,
    meta_wa_active: true,
    country: 'CO',
    organization_id: '9e8f8795-5fc7-4bbc-af6f-b19f64214dd9'
  };

  const { data: existingStore } = await supabase
    .from('stores')
    .select('*')
    .eq('name', store.name)
    .single();

  if (existingStore) {
    // Update
    const { error } = await supabase
      .from('stores')
      .update(store)
      .eq('id', existingStore.id);
    if (error) console.error(`Error updating ${store.name}:`, error);
    else console.log(`Updated ${store.name} successfully`);
  } else {
    // Insert
    const { error } = await supabase
      .from('stores')
      .insert([store]);
    if (error) console.error(`Error inserting ${store.name}:`, error);
    else console.log(`Inserted ${store.name} successfully`);
  }
}

main();
