import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadId, templateType, variables } = req.body;

  if (!leadId || !templateType) {
    return res.status(400).json({ error: 'Missing leadId or templateType' });
  }

  try {
    // 1. Obtener Lead y su Tienda
    const { data: lead } = await supabase.from('leads').select('phone, store_id').eq('id', leadId).single();
    if (!lead || !lead.phone) return res.status(400).json({ error: 'Lead no encontrado o sin teléfono' });

    // 2. Obtener Twilio Phone Number de la tienda
    const { data: store } = await supabase.from('stores').select('twilio_phone_number').eq('id', lead.store_id).single();
    if (!store || !store.twilio_phone_number) return res.status(400).json({ error: 'Tienda sin número de Twilio configurado' });

    // 3. Buscar la plantilla configurada para esta tienda y tipo
    let template;
    if (req.body.templateId) {
      const { data } = await supabase.from('store_templates').select('twilio_content_sid, template_name').eq('id', req.body.templateId).single();
      template = data;
    } else {
      const { data } = await supabase.from('store_templates').select('twilio_content_sid, template_name').eq('store_id', lead.store_id).eq('template_type', templateType).single();
      template = data;
    }
    
    if (!template || !template.twilio_content_sid) {
      return res.status(400).json({ error: 'La tienda no tiene una plantilla configurada en Twilio (Content API) para este tipo o ID.' });
    }

    // 4. Construir Payload para Twilio Content API
    // Las variables en Content API suelen ser mapeadas como 1, 2, 3... o el nombre de la variable. 
    // Usaremos un mapeo básico. Si la IA generó variables genéricas, las inyectaremos aquí.
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Mapeo dinámico: Construimos un objeto de variables JSON compatible con Twilio
    // Twilio usa llaves de string para las variables en Content API.
    const contentVariables: any = {};
    if (variables) {
      if (variables.customerName) contentVariables['1'] = variables.customerName;
      if (variables.productName) contentVariables['2'] = variables.productName;
      if (variables.city) contentVariables['3'] = variables.city;
      if (variables.address) contentVariables['4'] = variables.address;
      if (variables.department) contentVariables['5'] = variables.department;
      if (variables.totalPrice) contentVariables['6'] = variables.totalPrice;
      if (variables.orderId) contentVariables['7'] = variables.orderId;
    }

    // 5. Disparar a Twilio
    const message = await twilioClient.messages.create({
      from: `whatsapp:${store.twilio_phone_number}`,
      to: `whatsapp:${lead.phone}`,
      contentSid: template.twilio_content_sid,
      contentVariables: Object.keys(contentVariables).length > 0 ? JSON.stringify(contentVariables) : undefined,
    });

    return res.status(200).json({ success: true, messageId: message.sid });

  } catch (error: any) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}
