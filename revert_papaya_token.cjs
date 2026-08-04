const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Reverting to the token that ACTUALLY worked for WhatsApp yesterday
  const { data, error } = await supabase.from('stores')
    .update({ meta_access_token: 'EAAH5fjPTu2gBR860AMxikZBeCz6ZAMcAv8xnrQZBDseCQkitFKtNSTjbZCwJeTaGKgg4Ia2kPVYdZCBGjuhRcRpZC8dSUZAq9r5xsteBILiixpZBpvkZCshlivh5EjnIBsWhM0PpV5NZAvhAdu0dIJhdMdSR6Ax6QnOsH496V32l177Mb6RyRFafyX7C4prmTRCSkzlgZDZD' })
    .eq('name', 'TiendaPapaya');
    
  if (error) {
    console.error("Error reverting token:", error);
  } else {
    console.log("Token reverted successfully for TiendaPapaya");
  }
}
main();
