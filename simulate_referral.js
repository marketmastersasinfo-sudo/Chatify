async function test() {
  const params = new URLSearchParams();
  params.append('From', 'whatsapp:+573000000010');
  params.append('To', 'whatsapp:+18106666654');
  params.append('ProfileName', 'Naty Test');
  params.append('Body', ''); // Empty body
  params.append('ReferralHeadline', 'Super Oferta Joggers');
  params.append('ReferralBody', 'Compra ya mismo');

  try {
    const res = await fetch('https://chatify-two.vercel.app/api/twilio-webhook', { 
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log("Status:", res.status);
    console.log("Text:", await res.text());
  } catch (e) {
    console.log(e);
  }
}
test();
