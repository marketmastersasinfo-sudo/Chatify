import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // 1. Obtener todas las tiendas locales
    const { data: localStoresData, error: storesError } = await supabase.from('stores').select('*');
    if (storesError) {
      console.error('Error fetching stores:', storesError);
      return;
    }
    const localStores = localStoresData || [];
    console.log(`Local stores count: ${localStores.length}`);
    if (localStores.length > 0) {
      console.log('Sample local store:', localStores[0]);
    }

    // 2. Llamar a la API de Shopyeasy
    const response = await fetch('https://shopyeasy-seven.vercel.app/api/chatify/export-abandoned?secret=chatify_sync_2026_x');
    const result = await response.json();
    console.log(`API Shopyeasy returned ${result.count} carts`);

    const countryMap = {
      'CO': 'Colombia',
      'MX': 'México',
      'AR': 'Argentina',
      'CL': 'Chile',
      'PE': 'Perú',
      'EC': 'Ecuador'
    };

    let imported = 0;
    let notFoundStoreCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    for (const cart of result.data) {
      const mappedCountry = countryMap[cart.storeCountry] || cart.storeCountry;
      
      const store = localStores.find((s: any) => 
        s.name.toLowerCase() === cart.storeName.toLowerCase() && 
        s.country.toLowerCase() === mappedCountry.toLowerCase()
      );
      
      if (!store) {
        notFoundStoreCount++;
        // console.log(`Store not found for cart: ${cart.storeName} (${cart.storeCountry} -> ${mappedCountry})`);
        continue;
      }

      let phone = cart.customerPhone.replace(/[^\d+]/g, '');
      if (phone.length === 10) phone = `57${phone}`;

      const { data: existing } = await supabase.from('leads')
        .select('id')
        .eq('store_id', store.id)
        .eq('phone', phone)
        .maybeSingle();

      if (existing) {
        existingCount++;
        continue;
      }

      const { error } = await supabase.from('leads').insert({
        store_id: store.id,
        name: cart.customerName,
        phone: phone,
        traffic_source: 'Shopyeasy Webhook (Histórico)',
        board_type: 'remarketing_carts',
        status: 'contact_1',
        notes: `Order ID: ${cart.id || 'N/A'}\nCity: ${cart.city}\nAddress: ${cart.address}\nProduct: ${cart.productName}`
      } as any);

      if (!error) {
        imported++;
      } else {
        errorCount++;
        console.error("Error insertando lead:", error);
      }
    }

    console.log(`Imported: ${imported}`);
    console.log(`Store Not Found: ${notFoundStoreCount}`);
    console.log(`Existing Leads Skipped: ${existingCount}`);
    console.log(`Insert Errors: ${errorCount}`);

  } catch(e) {
    console.error(e);
  }
}
test();
