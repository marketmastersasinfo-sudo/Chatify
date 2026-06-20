import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrg() {
  console.log("Fetching orgs...");
  const { data, error } = await supabase.from('organizations').select('*');
  if (error) {
    console.error("Fetch error:", error);
    return;
  }
  console.log("Orgs count:", data?.length);
  if (data && data.length > 0) {
    console.log("First org:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No organizations found.");
  }
}

testOrg();
