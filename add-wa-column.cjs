const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumn() {
  // Check if column exists by trying to read it
  const { data, error } = await supabase
    .from('stores')
    .select('meta_wa_active')
    .limit(1);

  if (error && error.message.includes('meta_wa_active')) {
    console.log('Column does not exist, need to add via SQL');
    console.log('Run this SQL in Supabase Dashboard:');
    console.log('ALTER TABLE stores ADD COLUMN IF NOT EXISTS meta_wa_active BOOLEAN DEFAULT true;');
    console.log('ALTER TABLE stores ADD COLUMN IF NOT EXISTS waba_id TEXT;');
  } else {
    console.log('Column meta_wa_active already exists:', data);
    // Set TiendaPapaya to active
    const { data: updated, error: updateErr } = await supabase
      .from('stores')
      .update({ 
        meta_wa_active: true,
      })
      .eq('id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
      .select('id, name, meta_wa_active')
      .single();
    
    if (updateErr) {
      console.log('Update error:', updateErr);
    } else {
      console.log('Updated:', updated);
    }
  }
}

addColumn();
