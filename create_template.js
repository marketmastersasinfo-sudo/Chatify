import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function create() {
  const storeId = 'c6f3f1b1-42b6-4147-82c7-4bf440f8b38d'; // ComprasYa
  const name = 'confirmacion_inicial_v1';
  
  const twilioPayload = {
    friendlyName: name,
    language: 'es',
    types: {
      'twilio/quick-reply': {
        body: 'Hola {{1}} 👋\n\nTu pedido ha sido registrado exitosamente.\n\n📦 Detalle:\n• Producto: {{2}}\n• Valor: {{3}}\n\n📍 Envío a:\n{{4}}, {{5}}, {{6}}\n\nEl proceso de preparación iniciará en las próximas horas.\n\nPuedes verificar o actualizar los datos desde este mensaje.',
        actions: [
          { id: 'btn_1', title: 'Todo está correcto' },
          { id: 'btn_2', title: 'Actualizar información' }
        ]
      }
    },
    variables: {
      "1": "María",
      "2": "Kit para el cabello",
      "3": "$89.900",
      "4": "Calle 45 #23-67",
      "5": "Bogotá",
      "6": "Cundinamarca"
    }
  };

  try {
    console.log('Creating content in Twilio...');
    const content = await twilioClient.content.v1.contents.create(twilioPayload);
    console.log('Content SID:', content.sid);

    console.log('Submitting for WhatsApp approval...');
    const approval = await twilioClient.content.v1.contents(content.sid).approvalCreate.create({
      category: 'UTILITY',
      name: name
    });
    console.log('Approval status:', approval.status);

    console.log('Updating database...');
    // Delete old confirmation
    await supabase.from('store_templates').delete().eq('store_id', storeId).eq('template_type', 'order_confirmation');
    
    // Insert new confirmation
    await supabase.from('store_templates').insert({
      store_id: storeId,
      template_name: name,
      twilio_content_sid: content.sid,
      twilio_approval_status: approval.status,
      template_type: 'order_confirmation'
    });

    console.log('Done!');
  } catch (e) {
    console.error(e);
  }
}

create();
