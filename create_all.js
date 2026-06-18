const storeId = "c6f3f1b1-42b6-4147-82c7-4bf440f8b38d";

const templates = [
  {
    name: "confirmacion_pedido_alternativa",
    category: "UTILITY",
    language: "es",
    components: [
      {
        type: "BODY",
        text: "¡Hola {{1}}! 🎉 Gracias por confiar en nosotros.\n\nYa tenemos todo listo para empezar a empacar tu pedido. Aquí te dejo el resumen para que verifiques que todo esté perfecto:\n\n🛍️ *Producto:* {{2}}\n💰 *Total a pagar:* {{3}}\n\n📍 *Llegará a esta dirección:*\n{{4}} - {{5}}, {{6}}\n\nTu paquete empezará su viaje muy pronto. Si notas algún error en la dirección o quieres agregar algo más, ¡este es el momento ideal!\n\n¿Los datos están correctos?"
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "Todo correcto" },
          { type: "QUICK_REPLY", text: "Actualizar información" }
        ]
      }
    ],
    variableExamples: {
      "1": "María",
      "2": "Kit para el cabello",
      "3": "$89.900",
      "4": "Calle 45 #23-67",
      "5": "Bogotá",
      "6": "Cundinamarca"
    }
  },
  {
    name: "recuperar_carrito_version1",
    category: "MARKETING",
    language: "es",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}} 👋\n\nNoté que estuviste viendo nuestro *{{2}}* (Valor: {{3}}), pero no terminaste tu pedido.\n\nA veces la tecnología falla o simplemente nos distraemos. ¡No te preocupes! Guardé tu carrito intacto con envío a {{4}} ({{5}}).\n\n¿Tuviste algún problema al finalizar o tienes alguna duda sobre el producto antes de decidirte? Estoy aquí para ayudarte. 👇"
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "Confirmar pedido" },
          { type: "QUICK_REPLY", text: "Tengo una duda" }
        ]
      }
    ],
    variableExamples: {
      "1": "María",
      "2": "Kit Cuidado Capilar",
      "3": "$89.900",
      "4": "Calle 45 #23-67",
      "5": "Bogotá"
    }
  },
  {
    name: "recuperar_carrito_version2",
    category: "MARKETING",
    language: "es",
    components: [
      {
        type: "BODY",
        text: "Hola de nuevo, {{1}} ⏳\n\nSolo quería avisarte que tu pedido de *{{2}}* por {{3}} sigue separado a tu nombre, pero nuestro inventario se está moviendo rápido hoy.\n\n📍 Tenemos lista tu guía para envío a: {{4}}, {{5}}.\n\nNos encantaría que pudieras disfrutar de este producto lo antes posible. ¿Te gustaría que confirmemos tu envío de una vez para que salga en el próximo despacho? 🚀"
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "¡Sí, confirmar envío!" },
          { type: "QUICK_REPLY", text: "Hablar con asesor" }
        ]
      }
    ],
    variableExamples: {
      "1": "María",
      "2": "Kit Cuidado Capilar",
      "3": "$89.900",
      "4": "Calle 45 #23-67",
      "5": "Bogotá"
    }
  },
  {
    name: "recuperar_carrito_version3",
    category: "MARKETING",
    language: "es",
    components: [
      {
        type: "BODY",
        text: "¡Último aviso, {{1}}! 🚨\n\nTu reserva para el *{{2}}* está a punto de vencer en nuestro sistema y tendremos que liberar el producto para otros clientes.\n\n📍 Tu envío a {{4}}, {{5}} está a un solo clic de confirmarse.\n\nSi aún lo quieres, esta es tu última oportunidad de mantenerlo asegurado (Valor: {{3}}). ¡No dejes pasar la oportunidad!\n\n¿Damos luz verde a tu envío? 🟢"
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "Confirmar mi pedido" },
          { type: "QUICK_REPLY", text: "Ya no lo quiero" }
        ]
      }
    ],
    variableExamples: {
      "1": "María",
      "2": "Kit Cuidado Capilar",
      "3": "$89.900",
      "4": "Calle 45 #23-67",
      "5": "Bogotá"
    }
  }
];

async function run() {
  for (const payload of templates) {
    try {
      console.log(`Creating template: ${payload.name}`);
      const res = await fetch(`https://chatify-teal-xi.vercel.app/api/meta/templates?storeId=${storeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log(`Response for ${payload.name}:`, data);
      await new Promise(r => setTimeout(r, 2000)); // Delay between requests
    } catch (err) {
      console.error(`Error with ${payload.name}:`, err);
    }
  }
}

run();
