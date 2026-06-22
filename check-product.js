import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function check() {
  try {
    const { data: product } = await supabase.from('products')
      .select('name, media_assets')
      .ilike('name', '%Semillas de cal%')
      .limit(1).single();
    
    console.log(product);
  } catch (e) {
    console.error(e);
  }
}
check();
