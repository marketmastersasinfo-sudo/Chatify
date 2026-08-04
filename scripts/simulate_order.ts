import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.vercel' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateOrder() {
  console.log('Buscando tienda TiendaPapaya...');
  const { data: store } = await supabase.from('stores').select('id, name').ilike('name', '%papaya%').single();
  if (!store) return console.log('Store not found');
  console.log('TiendaPapaya ID:', store.id);

  // We construct the payload that Shopyeasy would send
  const payload = {
    storeName: 'TiendaPapaya',
    storeCountry: 'CO',
    customerPhone: '+573182533893', // User's personal phone
    customerName: 'Felipe',
    eventType: 'order_confirmation', // Triggers the confirmation template
    orderId: 'TP-' + Math.floor(Math.random() * 10000),
    totalPrice: 150000,
    address: 'Carrera 8H # 173-48 El redil de castilla 1 Casa 69',
    city: 'Bogota',
    products: [
      {
        name: 'Producto de Prueba',
        quantity: 1,
        price: 150000
      }
    ]
  };

  console.log('Enviando webhook...');
  // We can hit the local dev server or the vercel production server.
  // Since we just deployed to production, we can hit production directly!
  const url = `https://chatify-teal-xi.vercel.app/api/shopyeasy-webhook?storeId=${store.id}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

simulateOrder();
