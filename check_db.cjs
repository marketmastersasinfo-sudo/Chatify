require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data: page } = await supabase.from('connected_pages').select('*').eq('page_id', '240543465799764').single();
    console.log('Connected Page:', page);

    const { data: comments } = await supabase.from('pending_comments').select('*');
    console.log('Comments:', comments);

    if (page && page.store_id) {
        const { data: products } = await supabase.from('products').select('*').eq('store_id', page.store_id);
        console.log('Products:', products);
    }
}

check();
