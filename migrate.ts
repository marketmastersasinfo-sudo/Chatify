import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function migrate() {
  console.log('Migrating Remarketing Carts...');
  await supabase.from('leads').update({ status: 'abandoned' }).eq('board_type', 'remarketing_carts').eq('status', 'cooling');
  await supabase.from('leads').update({ status: 'bot_sent' }).eq('board_type', 'remarketing_carts').eq('status', 'contact_1');
  await supabase.from('leads').update({ status: 'negotiating' }).eq('board_type', 'remarketing_carts').eq('status', 'contact_2');
  
  console.log('Migrating Remarketing WA...');
  await supabase.from('leads').update({ status: 'abandoned' }).eq('board_type', 'remarketing').eq('status', 'cooling');
  await supabase.from('leads').update({ status: 'bot_sent' }).eq('board_type', 'remarketing').eq('status', 'contact_1');
  await supabase.from('leads').update({ status: 'negotiating' }).eq('board_type', 'remarketing').eq('status', 'contact_2');

  console.log('Migrating Logistics...');
  await supabase.from('leads').update({ status: 'confirmation_sent' }).eq('board_type', 'logistics').eq('status', 'foto');
  await supabase.from('leads').update({ status: 'client_replied' }).eq('board_type', 'logistics').eq('status', 'modificacion');

  console.log('Done.');
}

migrate();
