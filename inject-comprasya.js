import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('Buscando tienda ComprasYa...');
    const { data: store, error: storeErr } = await supabase
        .from('stores')
        .select('id, name')
        .ilike('name', '%ComprasYa%')
        .single();
        
    if (storeErr || !store) {
        console.error('Error buscando tienda:', storeErr);
        return;
    }
    
    console.log(`Tienda encontrada: ${store.name} (${store.id})`);
    
    const numberData = {
        name: 'Compras en un click',
        phone_number: '+57 320 4527225',
        phone_number_id: '493736050497479',
        waba_id: '521462044386660',
        access_token: 'EAAWaEsDhjWIBR0UAoZCBqcegoZBUGnJBRvjHCKFmZCWnOqFsE9YnFlPZBbUJCxYqCpdUYMuuUe87a0GkDDmFk0NECSGRbuLookC0aeMLZAh7IBFtGM2ogyy9zNZCapkg36ZCNun7wZBw4LLmQM5B3ZCz3yTwtPwvNHzQ6QOwdthSfhKbDWzX12dfnqvBKdrZAaassPgQZDZD',
        store_id: store.id
    };
    
    console.log('Inyectando número en meta_whatsapp_numbers...');
    const { data: inserted, error: insertErr } = await supabase
        .from('meta_whatsapp_numbers')
        .upsert(numberData, { onConflict: 'phone_number_id' })
        .select();
        
    if (insertErr) {
        console.error('Error insertando número:', insertErr);
    } else {
        console.log('¡Número insertado con éxito!', inserted);
        
        // También inyectamos para retrocompatibilidad
        await supabase.from('stores').update({
            meta_phone_number_id: numberData.phone_number_id,
            meta_access_token: numberData.access_token,
            waba_id: numberData.waba_id
        }).eq('id', store.id);
        console.log('Retrocompatibilidad actualizada en la tabla stores.');
    }
}

run();
