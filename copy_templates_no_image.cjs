const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

function callGraph(path, method = 'POST', bodyData = null) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v20.0${path}`;
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (bodyData) req.write(JSON.stringify(bodyData));
    req.end();
  });
}

const TEMPLATES_TO_CREATE = [
  {
    name: 'confirmacion_inicial_v1_optimizada',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}} 👋\n\nTu pedido ha sido registrado exitosamente.\n\n📦 Detalle:\n• Producto: {{2}}\n• Valor: ${{3}}\n\n📍 Envío a:\n{{4}}, {{5}}, {{6}}\n\nEl proceso de preparación iniciará en las próximas horas.\n\nPuedes verificar o actualizar los datos desde este mensaje.',
        example: { body_text: [['Juan', 'Tenis Nike', '150.000', 'Calle 123', 'Bogotá', 'Cundinamarca']] }
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Todo está correcto' },
          { type: 'QUICK_REPLY', text: 'Actualizar información' }
        ]
      }
    ]
  },
  {
    name: 'carrito_abandonado_inicial_utility_v1_texto',
    language: 'es',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}} 👋\n\nVimos que tu pedido quedó pendiente y corresponde al siguiente producto:\n\nProducto: {{2}}\nValor: ${{3}}\n\nLa información de envío registrada es:\nDirección: {{4}}\nCiudad: {{5}}\n\nSi aún deseas continuar con el proceso de compra, podemos ayudarte a finalizar el pedido o ajustar cualquier dato si es necesario.',
        example: { body_text: [['Juan', 'Tenis Nike', '150.000', 'Calle 123', 'Bogotá']] }
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Confirmar pedido' },
          { type: 'QUICK_REPLY', text: 'Modificar información' }
        ]
      }
    ]
  },
  {
    name: 'carrito_abandonado_recordatorio1_marketing_v1_optimizado',
    language: 'es',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}} 👋\n\nNotamos que tu pedido quedó pendiente:\n\n📦 {{2}} - ${{3}}\n📍 {{4}}, {{5}}\n\n¿Tuviste algún inconveniente para finalizar la compra?\n\nUn asesor puede ayudarte a completar el pedido o resolver cualquier duda.',
        example: { body_text: [['Juan', 'Tenis Nike', '150.000', 'Calle 123', 'Bogotá']] }
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Confirmar pedido' },
          { type: 'QUICK_REPLY', text: 'Hablar con asesor' }
        ]
      }
    ]
  },
  {
    name: 'carrito_abandonado_recordatorio_final_marketing_v1_optimizado',
    language: 'es',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}} 👋\n\nTu pedido de {{2}} (${{3}}) sigue disponible.\n\n📍 Envío a: {{4}}, {{5}}\n\nEste es el último recordatorio antes de que el registro expire del sistema.\n\nSi deseas completar la compra o necesitas ayuda, podemos asistirte ahora.',
        example: { body_text: [['Juan', 'Tenis Nike', '150.000', 'Calle 123', 'Bogotá']] }
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Confirmar pedido' },
          { type: 'QUICK_REPLY', text: 'Hablar con asesor' }
        ]
      }
    ]
  }
];

async function main() {
  const targetPhones = ['+57 300 9630919', '+573157003102', '+573133556020', '+573204527225', '+573212109697'];
  const { data: numbers } = await supabase.from('whatsapp_numbers').select('*').in('phone_number', targetPhones);
  
  for (const num of numbers) {
    if (!num.waba_id || !num.whatsapp_token) continue;
    
    console.log(`\n==========================================`);
    console.log(`Inyectando plantillas para: ${num.display_name}`);
    console.log(`==========================================`);
    
    for (const template of TEMPLATES_TO_CREATE) {
      const res = await callGraph(`/${num.waba_id}/message_templates?access_token=${num.whatsapp_token}`, 'POST', template);
      if (res.status === 200 || res.status === 201) {
        console.log(`✅ Creada: ${template.name}`);
      } else {
        if (res.data?.error?.message?.includes('already exists')) {
          console.log(`⚠️ Ya existía: ${template.name}`);
        } else {
          console.log(`❌ Error en ${template.name}:`, res.data?.error?.message);
        }
      }
    }
  }
}

main();
