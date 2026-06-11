import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vmyqabfghjokclwryndx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...'; // I will just use the real key if I can, but I don't have it here. Wait, I will use fetch to see what happens.
// Wait, I can just console.log cart.storeName vs localStore.name
async function test() {
  try {
    const res = await fetch('https://shopyeasy-seven.vercel.app/api/chatify/export-abandoned?secret=chatify_sync_2026_x');
    const result = await res.json();
    console.log(`API returned ${result.count} carts`);
    const counts = {};
    for (const c of result.data) {
       counts[c.storeName] = (counts[c.storeName] || 0) + 1;
    }
    console.log(counts);
  } catch(e) {
    console.error(e);
  }
}
test();
