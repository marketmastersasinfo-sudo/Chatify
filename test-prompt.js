import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prompt = `Eres Sophia...
SECUENCIA ESTRICTA DE VENTAS (EMBUDO)
Debes seguir ESTRICTAMENTE esta secuencia paso a paso. No te saltes pasos. Evalúa la conversación con el cliente para saber en qué paso estás, y ejecuta ÚNICAMENTE la instrucción del paso actual o del siguiente paso si el cliente ya respondió lo necesario.
¡IMPORTANTE!: Si la instrucción del paso contiene etiquetas entre corchetes como [MEDIA_X], [VIDEO_X], [AUDIO_X], [GIF_X] o [FILE_X], DEBES COPIARLAS Y PEGARLAS EXACTAMENTE IGUAL en tu respuesta. Estos son comandos de sistema que inyectan los archivos al cliente. ¡No los omitas!

PASO 1 - Apertura:
Saluda: ¡Hola! Bienvenido. Preséntate... [MEDIA_11] [MEDIA_8]

FORMATO DE SALIDA ESTRICTO
OUTPUT FORMAT:
Return a raw JSON object with the following structure:
{
  "reply": "El mensaje de WhatsApp que le enviarás al cliente.",
  "intent": "None"
}`;

async function run() {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Hola, me interesan los joggers' }],
    temperature: 0.65,
    response_format: { type: 'json_object' }
  });
  console.log(response.choices[0].message.content);
}
run();
