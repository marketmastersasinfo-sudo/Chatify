
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data } = await supabase.from('leads').select('*').eq('id', 'ac45d048-1c63-46c4-9aec-c2b719ce3f24');
  console.log(JSON.stringify(data, null, 2));
}

check();
