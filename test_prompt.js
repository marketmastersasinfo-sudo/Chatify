import { createClient } from '@supabase/supabase-js';
import { buildSophiaPrompt } from './api/utils/_sophia-prompt.js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: lead } = await supabase.from('leads').select('*').eq('phone', '573232812527').single();
  const { data: productInfo } = await supabase.from('products').select('*').ilike('name', '%JOGGER HOMBRE VARIABLE%').limit(1).single();

  try {
    const prompt = buildSophiaPrompt(lead, productInfo, '', '', { storeCountry: 'Colombia' });
    console.log("PROMPT GENERADO CORRECTAMENTE:");
    console.log(prompt.substring(0, 100) + '...');
  } catch (e) {
    console.error("ERROR EN BUILDSOPHIAPROMPT:", e);
  }
}
check();
