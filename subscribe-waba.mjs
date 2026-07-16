const token = 'EAAH5fjPTu2gBR860AMxikZBeCz6ZAMcAv8xnrQZBDseCQkitFKtNSTjbZCwJeTaGKgg4Ia2kPVYdZCBGjuhRcRpZC8dSUZAq9r5xsteBILiixpZBpvkZCshlivh5EjnIBsWhM0PpV5NZAvhAdu0dIJhdMdSR6Ax6QnOsH496V32l177Mb6RyRFafyX7C4prmTRCSkzlgZDZD';

async function subscribeApp() {
  // Check which WABA has the phone number
  const wabas = ['2508397522873921', '563501586837458'];
  
  for (const wabaId of wabas) {
    console.log(`\n=== WABA ${wabaId}: Checking phone numbers ===`);
    const res = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/phone_numbers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Phone numbers:', JSON.stringify(data, null, 2));

    // Check subscribed apps
    console.log(`\n=== WABA ${wabaId}: Checking subscribed apps ===`);
    const subRes = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const subData = await subRes.json();
    console.log('Subscribed apps:', JSON.stringify(subData, null, 2));
  }

  // Now subscribe the app to BOTH WABAs
  for (const wabaId of wabas) {
    console.log(`\n=== SUBSCRIBING APP TO WABA ${wabaId} ===`);
    const res = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Subscribe result:', JSON.stringify(data, null, 2));
  }

  // Verify subscriptions
  for (const wabaId of wabas) {
    console.log(`\n=== VERIFY WABA ${wabaId} subscription ===`);
    const res = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Subscribed apps now:', JSON.stringify(data, null, 2));
  }
}

subscribeApp();
