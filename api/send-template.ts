import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

    // 2. Obtener Token de la tienda
    const { data: store } = await supabase.from('stores').select('meta_access_token, waba_number').eq('id', lead.store_id).single();
    if (!store || !store.meta_access_token) return res.status(400).json({ error: 'Tienda sin token configurado' });

    // 3. Buscar la plantilla configurada para esta tienda y tipo
    const { data: template } = await supabase.from('store_templates').select('template_name, language_code, image_url').eq('store_id', lead.store_id).eq('template_type', templateType).single();
    
    if (!template || !template.template_name) {
      return res.status(400).json({ error: 'La tienda no tiene una plantilla configurada para este tipo.' });
    }

    // 4. Construir el Payload para Meta
    // Nota: Por ahora asumimos una plantilla sin variables. Si tienes variables, hay que agregarlas en components.
    const metaPayload: any = {
      messaging_product: 'whatsapp',
      to: lead.phone,
      type: 'template',
      template: {
        name: template.template_name,
        language: { code: template.language_code || 'es_CO' }
      }
    };

    // Si hay imagen configurada, la inyectamos como variable del header
    const componentsArray: any[] = [];
    
    if (template.image_url) {
      componentsArray.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: template.image_url }
          }
        ]
      });
    }

    // Inyectar variables de texto en el Body si vienen desde el Webhook
    if (variables) {
      const bodyParameters = [];
      
      if (variables.customerName) bodyParameters.push({ type: 'text', text: variables.customerName });
      if (variables.productName) bodyParameters.push({ type: 'text', text: variables.productName });
      if (variables.city) bodyParameters.push({ type: 'text', text: variables.city });
      if (variables.address) bodyParameters.push({ type: 'text', text: variables.address });

      if (bodyParameters.length > 0) {
        componentsArray.push({
          type: 'body',
          parameters: bodyParameters
        });
      }
    }

    if (componentsArray.length > 0) {
      metaPayload.template.components = componentsArray;
    }

    // 5. Disparar a Meta
    const phoneId = store.waba_number || '1214960561689813'; // Default to test number if not found
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${store.meta_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Meta API Error:', data);
      return res.status(400).json({ error: 'Failed to send template via Meta', details: data });
    }

    return res.status(200).json({ success: true, messageId: data.messages?.[0]?.id });

  } catch (error: any) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}
