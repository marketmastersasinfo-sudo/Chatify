import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function testInsert() {
  const { data, error } = await supabase.from('messages').insert({
    lead_id: 'd502989a-994b-414c-8cd0-51ab88917f8f', // naty
    sender_type: 'client',
    content: '   ' // empty spaces
  });
  console.log("Insert result:", { data, error });
}
testInsert();
