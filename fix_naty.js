import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function fix() {
  const { data: lead } = await supabase.from('leads').select('id').ilike('name', 'naty%').single();
  const { data: msgs } = await supabase.from('messages').select('*').eq('lead_id', lead.id).ilike('content', '%Aquí te muestro los estilos%');
  
  if (msgs.length > 0) {
    let text = msgs[0].content;
    text = text.replace('Mira este detalle de la tela 👉', 'Mira este detalle de la tela 👉\n[IMG:https://gygrudkogjqymmcubnon.supabase.co/storage/v1/object/public/chatify_media/1782008484444_pf1lni.jpg]');
    text = text.replace('Mira los colores que manejamos 👉', 'Mira los colores que manejamos 👉\n[IMG:https://gygrudkogjqymmcubnon.supabase.co/storage/v1/object/public/chatify_media/1782008485474_4cx5kh.jpg]');
    
    await supabase.from('messages').update({ content: text }).eq('id', msgs[0].id);
    console.log("Corregido mensaje de naty");
  }
}
fix();
