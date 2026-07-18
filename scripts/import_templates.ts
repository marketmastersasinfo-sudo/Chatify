import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.vercel' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function importTemplates() {
  console.log('🔄 Iniciando importación de plantillas desde Meta...');

  const { data: numbers, error: numbersError } = await supabase
    .from('whatsapp_numbers')
    .select('store_id, waba_id, access_token, stores(name)');

  if (numbersError) {
    console.error('❌ Error obteniendo números:', numbersError);
    return;
  }

  for (const num of numbers) {
    if (!num.waba_id || !num.access_token) {
      console.log(`⚠️ Tienda ${(num.stores as any)?.name} no tiene WABA ID o Token configurado. Saltando...`);
      continue;
    }

    console.log(`\n📥 Consultando plantillas para ${(num.stores as any)?.name} (WABA: ${num.waba_id})...`);
    
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${num.waba_id}/message_templates?limit=100`, {
        headers: {
          'Authorization': `Bearer ${num.access_token}`
        }
      });
      
      const data = await res.json();
      
      if (data.error) {
        console.error(`❌ Error Meta para ${(num.stores as any)?.name}:`, data.error.message);
        continue;
      }

      const templates = data.data || [];
      console.log(`✅ Encontradas ${templates.length} plantillas en Meta.`);

      let orderTmpl = templates.find((t: any) => t.name.includes('order') || t.name.includes('pedido') || t.name.includes('confirm'));
      let cartTmpl = templates.find((t: any) => t.name.includes('cart') || t.name.includes('abandon') || t.name.includes('carrito'));

      if (!orderTmpl && templates.length > 0) orderTmpl = templates[0];
      if (!cartTmpl && templates.length > 1) cartTmpl = templates[1];

      // Upsert order confirmation
      if (orderTmpl) {
        await supabase.from('store_templates').upsert({
          store_id: num.store_id,
          template_type: 'order_confirmation',
          template_name: orderTmpl.name
        }, { onConflict: 'store_id,template_type' });
        console.log(`   - Asignada 'order_confirmation' -> ${orderTmpl.name}`);
      }

      // Upsert abandoned cart
      if (cartTmpl) {
        await supabase.from('store_templates').upsert({
          store_id: num.store_id,
          template_type: 'abandoned_cart',
          template_name: cartTmpl.name
        }, { onConflict: 'store_id,template_type' });
        console.log(`   - Asignada 'abandoned_cart' -> ${cartTmpl.name}`);
      }

    } catch (e: any) {
      console.error(`❌ Excepción procesando ${(num.stores as any)?.name}:`, e.message);
    }
  }
  
  console.log('\n🎉 Proceso de importación finalizado.');
}

importTemplates();
