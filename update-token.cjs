const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

const NEW_TOKEN = 'EAAH5fjPTu2gBR860AMxikZBeCz6ZAMcAv8xnrQZBDseCQkitFKtNSTjbZCwJeTaGKgg4Ia2kPVYdZCBGjuhRcRpZC8dSUZAq9r5xsteBILiixpZBpvkZCshlivh5EjnIBsWhM0PpV5NZAvhAdu0dIJhdMdSR6Ax6QnOsH496V32l177Mb6RyRFafyX7C4prmTRCSkzlgZDZD';

async function updateToken() {
  // First check current value
  const { data: store, error: readErr } = await supabase
    .from('stores')
    .select('id, name, meta_access_token, meta_phone_number_id')
    .eq('meta_phone_number_id', '723025644229688')
    .single();

  if (readErr) {
    console.error('Error reading store:', readErr);
    return;
  }

  console.log('Store found:', store.name, '(ID:', store.id, ')');
  console.log('Old token (first 30 chars):', store.meta_access_token?.substring(0, 30));

  // Update with new permanent token
  const { data: updated, error: updateErr } = await supabase
    .from('stores')
    .update({ meta_access_token: NEW_TOKEN })
    .eq('id', store.id)
    .select('id, name, meta_access_token')
    .single();

  if (updateErr) {
    console.error('Error updating:', updateErr);
    return;
  }

  console.log('✅ Token actualizado correctamente para:', updated.name);
  console.log('New token (first 30 chars):', updated.meta_access_token?.substring(0, 30));
}

updateToken();
