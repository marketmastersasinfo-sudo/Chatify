import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const { error, data } = await supabase.from('leads').upsert({
      store_id: 1, // dummy
      name: 'Test',
      phone: '1234567890',
      traffic_source: 'Shopyeasy Webhook (Histórico)',
      board_type: 'remarketing_carts',
      status: 'contact_1',
      notes: `Order ID: 1`
    } as any, { onConflict: 'phone' });
    
    console.log('Supabase Error:', error);
    console.log('Supabase Data:', data);
  } catch(e) {
    console.error(e);
  }
}
test();
