import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { storeId } = req.query;

  if (!storeId) {
    return res.status(400).json({ error: 'Falta el storeId en la petición' });
  }

  try {
    // 1. Verificar tienda (solo por validación, usamos Twilio global)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId as string)
      .single();

    if (storeError || !store) {
      return res.status(400).json({ error: 'Tienda no encontrada.' });
    }

    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // ==========================================
    // GET: Obtener todas las plantillas de Twilio
    // ==========================================
    if (req.method === 'GET') {
      const contents = await twilioClient.content.v1.contents.list({ limit: 100 });
      
      // Fetch our local templates to get the proper names and categories
      const { data: localTemplates } = await supabase
        .from('store_templates')
        .select('*')
        .eq('store_id', storeId as string);

      // Sincronizar estado con Twilio si alguna está en received/pending
      if (localTemplates) {
        for (const local of localTemplates) {
          if (local.twilio_approval_status === 'received' || local.twilio_approval_status === 'pending') {
            try {
              const approval = await twilioClient.content.v1.contents(local.twilio_content_sid).approvalFetch().fetch();
              if (approval.status !== local.twilio_approval_status) {
                await supabase.from('store_templates')
                  .update({ twilio_approval_status: approval.status })
                  .eq('id', local.id);
                local.twilio_approval_status = approval.status;
              }
            } catch (err) {
              console.error('Error fetching approval status for', local.twilio_content_sid, err);
            }
          }
        }
      }

      // Formatear para que el frontend no se rompa tanto
      const formattedData = contents.map(c => {
        const local = localTemplates?.find(l => l.twilio_content_sid === c.sid);
        return {
          id: c.sid,
          name: local?.template_name || c.friendlyName || 'Sin Nombre',
          category: local?.template_type === 'custom' ? 'UTILITY' : 'MARKETING', // Fallback simplificado
          language: c.language,
          status: local?.twilio_approval_status || 'APPROVED', 
          created_at: local?.created_at || null,
          components: [
            {
              type: 'BODY',
              text: c.types['twilio/text']?.body || c.types['twilio/media']?.body || ''
            }
          ]
        };
      });

      return res.status(200).json({ success: true, data: formattedData });
    }

    // ==========================================
    // POST: Crear una nueva plantilla en Twilio Content API y enviarla a WhatsApp
    // ==========================================
    if (req.method === 'POST') {
      const payload = req.body;
      
      // 1. Crear el Content en Twilio
      // Asumimos que payload viene estructurado desde el frontend similar a Meta
      // Convertimos el payload de Meta a Twilio Content API
      
      let bodyText = '';
      const variables: any = {};
      
      const bodyComponent = payload.components?.find((c: any) => c.type === 'BODY');
      if (bodyComponent) {
        bodyText = bodyComponent.text;
        // Twilio usa {{1}}, Meta usa {{1}}. Si hay variables, las extraemos
        // En un caso real avanzado, el frontend debería mandar las variables de Twilio.
        // Simularemos un mapping simple.
        const regex = /{{(\d+)}}/g;
        let match;
        while ((match = regex.exec(bodyText)) !== null) {
          variables[match[1]] = `Var${match[1]}`;
        }
      }

      const buttonsComponent = payload.components?.find((c: any) => c.type === 'BUTTONS');

      const twilioContentPayload: any = {
        friendlyName: payload.name,
        language: payload.language || 'es',
        types: {}
      };

      if (buttonsComponent && buttonsComponent.buttons && buttonsComponent.buttons.length > 0) {
        twilioContentPayload.types['twilio/quick-reply'] = {
          body: bodyText || 'Plantilla vacía',
          actions: buttonsComponent.buttons.map((b: any, index: number) => ({
            id: `btn_${index}`,
            title: b.text
          }))
        };
      } else {
        twilioContentPayload.types['twilio/text'] = {
          body: bodyText || 'Plantilla vacía'
        };
      }

      if (Object.keys(variables).length > 0) {
        twilioContentPayload.variables = variables;
      }

      // Crear contenido
      const content = await twilioClient.content.v1.contents.create(twilioContentPayload);

      // 2. Enviar a aprobación de WhatsApp
      const approval = await twilioClient.content.v1.contents(content.sid).approvalCreate.create({
        category: payload.category || 'UTILITY',
        name: payload.name
      });

      // Guardar el SID en nuestra BD
      try {
        await supabase.from('store_templates').insert({
          store_id: storeId,
          template_name: payload.name,
          twilio_content_sid: content.sid,
          twilio_approval_status: approval.status,
          template_type: 'custom'
        });
      } catch (dbErr) {
        console.error('Error insertando en store_templates:', dbErr);
      }

      return res.status(200).json({ success: true, data: { id: content.sid, status: approval.status } });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Twilio Content API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
