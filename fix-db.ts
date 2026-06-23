import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDB() {
  // Find leads with status closed and total_price null
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, total_price, status')
    .eq('status', 'closed');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Encontrados ${leads.length} leads cerrados.`);
  let count = 0;

  for (const lead of leads) {
    if (!lead.total_price) {
      console.log(`Fixing lead ${lead.name} (${lead.id}) con precio 85000`);
      await supabase.from('leads').update({ total_price: 85000 }).eq('id', lead.id);
      count++;
    }
  }
  
  console.log(`Se arreglaron ${count} leads.`);
}

fixDB();
