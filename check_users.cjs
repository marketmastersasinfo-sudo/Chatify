const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: users, error } = await supabase
    .from('chatify_users')
    .select('*');
    
  if (error) console.error("Error:", error);
  else {
    console.log(`=== USUARIOS (${users.length}) ===`);
    users.forEach(u => {
      console.log(`\n${JSON.stringify(u, null, 2)}`);
    });
  }
}

main();
