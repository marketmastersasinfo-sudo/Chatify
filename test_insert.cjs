require('dotenv').config({ path: '.env.vercel' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('pending_comments').insert({
        page_id: 'DEBUG',
        post_id: 'DEBUG',
        comment_id: 'DEBUG_' + Date.now(),
        sender_id: 'DEBUG',
        sender_name: 'DEBUG',
        message: 'test',
        status: 'FAILED',
        process_after: new Date().toISOString()
      });
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
