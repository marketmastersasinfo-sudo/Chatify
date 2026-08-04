const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const token = 'EAAa44lUrYZBIBR1Dp7FPFTZC1WwQrlH1l5iQxZCbeMWH2CEbnx67wDTICuKe9ay4cxRaVhkGc9KptaOK4bt296TmOI1Q1cD7WZCYYxIizzoxlPcZBrjFW8Gfh2NSfjH2G7LIu8vgkesPJ4w58XR8GR7IBnKxwEy1488dzCWWris7FS9fc2rYLFJL3CwdfZAmk4QQZDZD';
  
  const storesToUpsert = [
    {
      name: 'Lacompracion',
      waba_number: '+573229839106',
      meta_phone_number_id: '420492581152329',
      meta_waba_id: '376669199094587',
      meta_access_token: token,
      meta_wa_active: true,
      country: 'CO',
      organization_id: '9e8f8795-5fc7-4bbc-af6f-b19f64214dd9'
    },
    {
      name: 'DLP',
      waba_number: '+573166563246',
      meta_phone_number_id: '454283704431997',
      meta_waba_id: '477305412128610',
      meta_access_token: token,
      meta_wa_active: true,
      country: 'CO',
      organization_id: '9e8f8795-5fc7-4bbc-af6f-b19f64214dd9'
    }
  ];

  for (const store of storesToUpsert) {
    // Check if store exists
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
}

main();
