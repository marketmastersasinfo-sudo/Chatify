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

    // 4. Obtener la definición de la plantilla desde Twilio para saber qué variables exige
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    let templateVariablesKeys: string[] = [];
    
    try {
      const content = await twilioClient.content.v1.contents(template.twilio_content_sid).fetch();
      if (content.variables) {
        templateVariablesKeys = Object.keys(content.variables);
      }
    } catch (e) {
      console.error('No se pudo obtener variables de la plantilla Twilio', e);
    }

    // 5. Construir Payload asegurando que NO mandamos variables sobrantes que hagan crashear la API
    const contentVariables: any = {};
    if (variables) {
      // Mapeo por defecto según el orden estándar (1: nombre, 2: producto, etc.)
      const mapping: Record<string, string> = {
        '1': variables.customerName || '',
        '2': variables.productName || 'tu pedido',
        '3': variables.city || '',
        '4': variables.address || '',
        '5': variables.department || '',
        '6': variables.totalPrice || '',
        '7': variables.orderId || ''
      };

      // SOLO agregar las variables que la plantilla realmente pide
      for (const key of templateVariablesKeys) {
        contentVariables[key] = mapping[key] || '';
      }
    }

    // Sanitize from number
    let fromNumber = store.twilio_phone_number.trim();
    fromNumber = fromNumber.replace(/ /g, '');
    if (fromNumber.startsWith('whatsapp:')) {
      fromNumber = fromNumber.replace('whatsapp:', '');
    }
    if (!fromNumber.startsWith('+')) {
      fromNumber = `+${fromNumber}`;
    }
    fromNumber = `whatsapp:${fromNumber}`;

    // Sanitize to number
    let toNumber = lead.phone.trim();
    toNumber = toNumber.replace(/ /g, '');
    if (toNumber.startsWith('whatsapp:')) {
      toNumber = toNumber.replace('whatsapp:', '');
    }
    if (!toNumber.startsWith('+')) {
      toNumber = `+${toNumber}`;
    }
    toNumber = `whatsapp:${toNumber}`;

    // 5. Disparar a Twilio
    const message = await twilioClient.messages.create({
      from: fromNumber,
      to: toNumber,
      contentSid: template.twilio_content_sid,
      contentVariables: Object.keys(contentVariables).length > 0 ? JSON.stringify(contentVariables) : undefined,
    });

    return res.status(200).json({ success: true, messageId: message.sid });

  } catch (error: any) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}
