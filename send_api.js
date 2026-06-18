const payload = {
  name: "confirmacion_pedido_v2",
  category: "UTILITY",
  language: "es",
  components: [
    {
      type: "BODY",
      text: "Hola {{1}} 👋\n\nTu pedido ha sido registrado exitosamente.\n\n📦 Detalle:\n• Producto: {{2}}\n• Valor: {{3}}\n\n📍 Envío a:\n{{4}}, {{5}}, {{6}}\n\nEl proceso de preparación iniciará en las próximas horas.\n\nPuedes verificar o actualizar los datos desde este mensaje."
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
};

async function run() {
  try {
    const res = await fetch("https://chatify-teal-xi.vercel.app/api/meta/templates?storeId=c6f3f1b1-42b6-4147-82c7-4bf440f8b38d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error(err);
  }
}

run();
