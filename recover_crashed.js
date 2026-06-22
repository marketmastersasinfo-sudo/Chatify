import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function recover() {
  const { data: leads } = await supabase
    .from('leads')
    .select('*, store:stores(twilio_phone_number)')
    .gte('created_at', '2026-06-22T16:00:00Z')
    .order('created_at', { ascending: false });

  let count = 0;
  for (const lead of leads) {
    const { data: msgs } = await supabase.from('messages').select('sender_type, content').eq('lead_id', lead.id);
    const hasClient = msgs.some(m => m.sender_type === 'client');
    const hasAI = msgs.some(m => m.sender_type === 'ai');

    if (hasClient && !hasAI && lead.store?.twilio_phone_number) {
      // Tomamos el último mensaje del cliente
      const lastMsg = msgs.filter(m => m.sender_type === 'client').pop();
      if (!lastMsg) continue;

      const payload = new URLSearchParams({
        From: `whatsapp:+${lead.phone}`,
        To: `whatsapp:+${lead.store.twilio_phone_number}`,
        ProfileName: lead.name || 'Cliente',
        Body: lastMsg.content
      });

      console.log(`Recuperando lead crasheado: ${lead.name} (${lead.phone})`);
      try {
        const res = await fetch('https://chatify-teal-xi.vercel.app/api/twilio-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: payload.toString()
        });
        if (res.ok) {
          console.log(`✅ [200] Rescatado: ${lead.name}`);
          count++;
        }
      } catch (e) {
        console.error(`❌ Error con ${lead.name}:`, e);
      }
    }
  }
  console.log(`¡Recuperación completada! ${count} leads rescatados.`);
}
recover();
