const token = 'EAAH5fjPTu2gBR860AMxikZBeCz6ZAMcAv8xnrQZBDseCQkitFKtNSTjbZCwJeTaGKgg4Ia2kPVYdZCBGjuhRcRpZC8dSUZAq9r5xsteBILiixpZBpvkZCshlivh5EjnIBsWhM0PpV5NZAvhAdu0dIJhdMdSR6Ax6QnOsH496V32l177Mb6RyRFafyX7C4prmTRCSkzlgZDZD';

async function fixWebhook() {
  // 1. Get the WABA ID from the phone number
  console.log('=== PASO 1: Obtener WABA ID ===');
  const phoneRes = await fetch('https://graph.facebook.com/v25.0/723025644229688?fields=id,display_phone_number,verified_name,webhook_configuration', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const phoneData = await phoneRes.json();
  console.log('Phone:', phoneData.display_phone_number);
  console.log('Webhook config:', JSON.stringify(phoneData.webhook_configuration));

  // 2. Get WABA ID - try getting it from the phone number's owner
  console.log('\n=== PASO 2: Buscar WABA ===');
  // The WABA ID should be in the app's business account
  // Let's try querying the WABA directly
  const wabaSearchRes = await fetch('https://graph.facebook.com/v25.0/555795407420264/subscribed_products', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const wabaSearch = await wabaSearchRes.json();
  console.log('App subscribed products:', JSON.stringify(wabaSearch, null, 2));

  // 3. Try to find WABA through the business
  console.log('\n=== PASO 3: Buscar WABA por negocio ===');
  const bizRes = await fetch('https://graph.facebook.com/v25.0/934803530962775/owned_whatsapp_business_accounts', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const bizData = await bizRes.json();
  console.log('WABAs del negocio:', JSON.stringify(bizData, null, 2));

  // 4. Try direct WABA lookup from phone number
  console.log('\n=== PASO 4: WABA desde phone number ===');
  const phoneWabaRes = await fetch('https://graph.facebook.com/v25.0/723025644229688?fields=wabaId:owner', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const phoneWaba = await phoneWabaRes.json();
  console.log('Phone WABA owner:', JSON.stringify(phoneWaba, null, 2));
}

fixWebhook();
