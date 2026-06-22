import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: store } = await supabase.from('stores').select('organization_id').eq('id', 'c6f3f1b1-42b6-4147-82c7-4bf440f8b38d').single();
  if (store) {
    const { data: org } = await supabase.from('organizations').select('*').eq('id', store.organization_id).single();
    console.log("ORG:", org);
  }
}
check();
