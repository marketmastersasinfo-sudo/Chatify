const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const whatsappToken = 'EAAa44lUrYZBIBRzW4WWUAjhC1Cjp51POwJqMEjf7lYziegac72KUCthi7656qLAw6qRu2pzMs9FSccmyS6suOIuD74qqulif8sekPYXVbjCkl7fef61UUQQpr0KRG1eLiWOEqqDnzwjIL2trOm2EnDSG7MqCEDW3eSrnVZBwb8uUZCGr0goOoAR9pDWDTidGgZDZD';
  
  const { data, error } = await supabase
    .from('stores')
    .update({ meta_access_token: whatsappToken })
    .in('name', ['Lacompracion', 'DLP']);
    
  if (error) console.error("Error updating tokens:", error);
  else console.log("WhatsApp tokens updated successfully for Lacompracion and DLP!");
}

main();
