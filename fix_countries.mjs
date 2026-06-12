import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim() && !key.startsWith('#')) {
    env[key.trim()] = val.join('=').trim();
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function fixCountries() {
  console.log("Checking stores...");
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) {
    console.error("Error fetching stores:", error);
    return;
  }
  
  let updated = 0;
  for (const store of stores) {
    if (!store.country || store.country.trim() === '') {
      console.log(`Fixing country for ${store.name}...`);
      const { error: updateError } = await supabase.from('stores').update({ country: 'Colombia' }).eq('id', store.id);
      if (updateError) {
        console.error(`Failed to update ${store.name}:`, updateError);
      } else {
        updated++;
      }
    }
  }
  console.log(`Successfully updated ${updated} stores with missing country!`);
}

fixCountries();
