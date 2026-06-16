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
              const approval = await twilioClient.content.v1.contents(local.twilio_content_sid).approvalFetch().fetch() as any;
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
        const types = c.types as any;
        return {
          id: c.sid,
          name: local?.template_name || c.friendlyName || 'Sin Nombre',
          category: local?.template_type === 'custom' ? 'UTILITY' : 'MARKETING',
          language: c.language,
          status: local?.twilio_approval_status || 'APPROVED', 
          created_at: local?.created_at || null,
          components: [
            {
              type: 'BODY',
              text: types['twilio/text']?.body || types['twilio/media']?.body || types['twilio/quick-reply']?.body || ''
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
      
      let bodyText = '';
      const variables: any = {};
      
      const bodyComponent = payload.components?.find((c: any) => c.type === 'BODY');
      if (bodyComponent) {
        bodyText = bodyComponent.text;
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
      }) as any;

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

    // ==========================================
    // PUT: Sincronizar nombres desde Chatify → Twilio (fix unnamed templates)
    // ==========================================
    if (req.method === 'PUT') {
      const { action } = req.body || {};
      
      if (action !== 'sync-names') {
        return res.status(400).json({ error: 'Acción no reconocida. Usa action: "sync-names"' });
      }

      // Load store_templates with valid names and SIDs
      const { data: localTemplates, error: dbErr } = await supabase
        .from('store_templates')
        .select('id, template_name, twilio_content_sid, twilio_approval_status')
        .eq('store_id', storeId as string)
        .not('twilio_content_sid', 'is', null)
        .not('template_name', 'is', null)
        .neq('template_name', '');

      if (dbErr) throw new Error('Error leyendo store_templates: ' + dbErr.message);

      const results: any[] = [];
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const base64Auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      for (const tmpl of (localTemplates || [])) {
        const sid = tmpl.twilio_content_sid?.trim();
        const name = tmpl.template_name?.trim();
        if (!sid || !name) continue;

        const result: any = { id: tmpl.id, name, sid, actions: [] };

        try {
          // Fetch current friendlyName
          const content = await twilioClient.content.v1.contents(sid).fetch();
          const currentFriendlyName = content.friendlyName;

          if (!currentFriendlyName || currentFriendlyName !== name) {
            // Update via Twilio REST API (SDK doesn't expose update for Content Templates)
            const updateRes = await fetch(`https://content.twilio.com/v1/Content/${sid}`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${base64Auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ FriendlyName: name }).toString(),
            });

            if (updateRes.ok) {
              result.actions.push(`✅ Renombrado a "${name}" en Twilio`);
            } else {
              const errBody = await updateRes.text();
              result.actions.push(`⚠️ No se pudo renombrar (${updateRes.status}): ${errBody.substring(0, 120)}`);
            }
          } else {
            result.actions.push(`ℹ️ Ya tenía el nombre correcto: "${currentFriendlyName}"`);
          }

          // Sync approval status back to Supabase
          try {
            const approval = await twilioClient.content.v1.contents(sid).approvalFetch().fetch() as any;
            const realStatus = approval.status || 'approved';
            if (realStatus !== tmpl.twilio_approval_status) {
              await supabase.from('store_templates').update({ twilio_approval_status: realStatus }).eq('id', tmpl.id);
              result.actions.push(`🔄 Estado actualizado: ${tmpl.twilio_approval_status} → ${realStatus}`);
            } else {
              result.actions.push(`✅ Estado correcto: ${realStatus}`);
            }
          } catch (approvalErr: any) {
            result.actions.push(`⚠️ No se pudo verificar estado: ${approvalErr.message}`);
          }

        } catch (twilioErr: any) {
          result.actions.push(`❌ Error Twilio: ${twilioErr.message}`);
        }

        results.push(result);
      }

      return res.status(200).json({ success: true, synced: results.length, results });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Twilio Content API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
