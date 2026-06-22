import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function recoverAll() {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, store:stores(twilio_phone_number)');

  let count = 0;
  for (const lead of leads) {
    const { data: msgs } = await supabase.from('messages')
      .select('sender_type, content, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true });

    if (!msgs || msgs.length === 0) continue;

    const lastMsg = msgs[msgs.length - 1];
    
    // Si el último mensaje es del cliente y ocurrió hoy después de las 11 AM (16:00 UTC)
    if (lastMsg.sender_type === 'client' && lastMsg.created_at > '2026-06-22T16:00:00Z' && lead.store?.twilio_phone_number) {
      
      const payload = new URLSearchParams({
        From: `whatsapp:+${lead.phone}`,
        To: `whatsapp:+${lead.store.twilio_phone_number}`,
        ProfileName: lead.name || 'Cliente',
        Body: lastMsg.content
      });

      console.log(`Rescatando definitivamente a: ${lead.name} (${lead.phone})`);
      try {
        const res = await fetch('https://chatify-teal-xi.vercel.app/api/twilio-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: payload.toString()
        });
        if (res.ok) {
          console.log(`✅ [200] Sophia disparada para: ${lead.name}`);
          count++;
        }
      } catch (e) {
        console.error(`❌ Error con ${lead.name}:`, e);
      }
    }
  }
  console.log(`¡Rescate final completado! ${count} leads procesados.`);
}
recoverAll();
