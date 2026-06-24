import { supabase } from './src/lib/supabase.js';

async function main() {
  const { data, error } = await supabase.from('stores').select('id, name').ilike('name', '%yaencasa%');
  if (error) console.error(error);
  else console.log(data);
}
main();
