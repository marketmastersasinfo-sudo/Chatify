import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { storeId } = req.query;

  if (!storeId) {
    return res.status(400).json({ error: 'Falta el storeId en la petición' });
  }

  try {
    // Get Meta credentials from whatsapp_numbers
    const { data: waNumber } = await supabase
      .from('whatsapp_numbers')
      .select('waba_id, access_token, phone_number_id, display_name')
      .eq('store_id', storeId as string)
      .limit(1)
      .single();

    // ==========================================
    // GET: Fetch templates
    // ==========================================
    if (req.method === 'GET') {
      const { action, startDate, endDate } = req.query;

      // --- ANALYTICS MODE ---
      if (action === 'analytics') {
        const { data: templates } = await supabase.from('store_templates')
          .select('id, template_name, template_type, is_active')
          .eq('store_id', storeId as string);
        if (!templates || templates.length === 0) return res.status(200).json({ success: true, data: [] });

        let query = supabase.from('messages')
          .select('template_id, is_conversion, created_at, converted_at')
          .in('template_id', templates.map(t => t.id));
        if (startDate) query = query.gte('created_at', startDate as string);
        if (endDate) query = query.lte('created_at', endDate as string);

        const { data: messages, error } = await query;
        if (error) throw error;

        const analyticsMap: Record<string, { sent: number, converted: number }> = {};
        templates.forEach(t => analyticsMap[t.id] = { sent: 0, converted: 0 });
        messages?.forEach(msg => {
          if (msg.template_id && analyticsMap[msg.template_id]) {
            analyticsMap[msg.template_id].sent += 1;
            if (msg.is_conversion) analyticsMap[msg.template_id].converted += 1;
          }
        });

        const results = templates.map(t => ({
          ...t,
          sent_count: analyticsMap[t.id].sent,
          conversion_count: analyticsMap[t.id].converted,
          conversion_rate: analyticsMap[t.id].sent > 0 ? Math.round((analyticsMap[t.id].converted / analyticsMap[t.id].sent) * 100) : 0
        }));

        return res.status(200).json({ success: true, data: results });
      }

      // --- NORMAL TEMPLATE FETCH MODE ---
      // Get local templates from DB
      const { data: localTemplates } = await supabase
        .from('store_templates')
        .select('*')
        .eq('store_id', storeId as string);

      // If we have Meta credentials, also fetch live status from Meta
      let metaTemplatesMap: Record<string, any> = {};
      if (waNumber?.waba_id && waNumber?.access_token) {
        try {
          let allMetaTemplates: any[] = [];
          let url = `https://graph.facebook.com/v25.0/${waNumber.waba_id}/message_templates?limit=100&fields=name,status,language,category,components`;
          
          while (url) {
            const metaRes = await fetch(url, {
              headers: { 'Authorization': `Bearer ${waNumber.access_token}` }
            });
            const metaData = await metaRes.json();
            if (metaData.error) {
              console.error('Meta templates fetch error:', metaData.error.message);
              break;
            }
            allMetaTemplates = allMetaTemplates.concat(metaData.data || []);
            url = metaData.paging?.next || '';
          }

          // Build a lookup map by name
          for (const mt of allMetaTemplates) {
            metaTemplatesMap[mt.name] = mt;
          }

          // Auto-import: If Meta has templates not in our DB, add them
          const localNames = new Set((localTemplates || []).map(t => t.template_name));
          const newMetaTemplates = allMetaTemplates.filter(mt => 
            mt.status === 'APPROVED' && !localNames.has(mt.name)
          );

          if (newMetaTemplates.length > 0) {
            const newRecords = newMetaTemplates.map(mt => ({
              store_id: storeId as string,
              template_name: mt.name,
              template_type: classifyTemplate(mt.name, mt.category),
              is_active: true,
              sent_count: 0,
              conversion_count: 0
            }));

            const { data: inserted } = await supabase
              .from('store_templates')
              .insert(newRecords)
              .select();

            if (inserted) {
              localTemplates?.push(...inserted);
            }
          }
        } catch (metaErr: any) {
          console.error('Meta API error (non-fatal):', metaErr.message);
        }
      }

      // Format for frontend
      const formattedData = (localTemplates || []).map(local => {
        const metaInfo = metaTemplatesMap[local.template_name];
        const components = metaInfo?.components || [];
        const bodyComp = components.find((c: any) => c.type === 'BODY');
        const buttonComp = components.find((c: any) => c.type === 'BUTTONS');

        const formattedComponents: any[] = [];
        if (bodyComp) {
          formattedComponents.push({ type: 'BODY', text: bodyComp.text || '' });
        }
        if (buttonComp?.buttons) {
          formattedComponents.push({
            type: 'BUTTONS',
            buttons: buttonComp.buttons.map((b: any) => ({
              type: b.type || 'QUICK_REPLY',
              text: b.text
            }))
          });
        }

        return {
          id: local.id,
          db_id: local.id,
          name: local.template_name,
          category: metaInfo?.category || local.template_type?.toUpperCase() || 'UTILITY',
          language: metaInfo?.language || 'es',
          status: metaInfo?.status || 'APPROVED',
          created_at: local.created_at,
          is_active: local.is_active ?? true,
          sent_count: local.sent_count || 0,
          conversion_count: local.conversion_count || 0,
          components: formattedComponents,
          source: metaInfo ? 'meta' : 'local_only'
        };
      });

      return res.status(200).json({ success: true, data: formattedData });
    }

    // ==========================================
    // PATCH: Toggle is_active status
    // ==========================================
    if (req.method === 'PATCH') {
      const { templateId, is_active } = req.body;
      if (!templateId) return res.status(400).json({ error: 'Falta templateId' });

      const { data, error } = await supabase
        .from('store_templates')
        .update({ is_active })
        .eq('id', templateId)
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, data });
    }

    // ==========================================
    // POST: Create a new template via Meta Cloud API
    // ==========================================
    if (req.method === 'POST') {
      if (!waNumber?.waba_id || !waNumber?.access_token) {
        return res.status(400).json({ error: 'Esta tienda no tiene credenciales de Meta configuradas. Configura un número de WhatsApp primero.' });
      }

      const payload = req.body;

      // Build Meta template components
      const components: any[] = [];

      // Header (optional)
      const headerComp = payload.components?.find((c: any) => c.type === 'HEADER');
      if (headerComp) {
        if (headerComp.format === 'IMAGE') {
          components.push({
            type: 'HEADER',
            format: 'IMAGE',
            example: headerComp.example ? { header_handle: headerComp.example.header_handle } : undefined
          });
        } else if (headerComp.format === 'TEXT') {
          components.push({ type: 'HEADER', format: 'TEXT', text: headerComp.text });
        }
      }

      // Body (required)
      const bodyComp = payload.components?.find((c: any) => c.type === 'BODY');
      if (bodyComp) {
        const bodyData: any = { type: 'BODY', text: bodyComp.text };
        // Add examples if variables exist
        const varMatches = bodyComp.text.match(/\{\{(\d+)\}\}/g);
        if (varMatches && payload.variableExamples) {
          bodyData.example = {
            body_text: [varMatches.map((m: string) => {
              const num = m.replace(/[{}]/g, '');
              return payload.variableExamples[num] || `Ejemplo${num}`;
            })]
          };
        }
        components.push(bodyData);
      }

      // Buttons (optional)
      const buttonsComp = payload.components?.find((c: any) => c.type === 'BUTTONS');
      if (buttonsComp?.buttons && buttonsComp.buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: buttonsComp.buttons.map((b: any) => ({
            type: b.type || 'QUICK_REPLY',
            text: b.text
          }))
        });
      }

      // Template name must be lowercase, underscore-only
      const templateName = (payload.name || 'template').toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Create template via Meta API
      const metaRes = await fetch(`https://graph.facebook.com/v25.0/${waNumber.waba_id}/message_templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waNumber.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: templateName,
          category: payload.category || 'UTILITY',
          language: payload.language || 'es',
          components
        })
      });

      const metaData = await metaRes.json();

      if (metaData.error) {
        return res.status(400).json({
          error: 'Error de Meta al crear la plantilla',
          details: metaData.error
        });
      }

      // Save to DB
      const { data: newTemplate } = await supabase.from('store_templates').insert({
        store_id: storeId as string,
        template_name: templateName,
        template_type: 'custom',
        is_active: false // Will become active when Meta approves
      }).select().single();

      return res.status(200).json({
        success: true,
        data: {
          id: newTemplate?.id || metaData.id,
          meta_id: metaData.id,
          status: metaData.status || 'PENDING',
          name: templateName
        }
      });
    }

    // ==========================================
    // PUT: Sync templates from Meta → Supabase
    // ==========================================
    if (req.method === 'PUT') {
      if (!waNumber?.waba_id || !waNumber?.access_token) {
        return res.status(400).json({ error: 'Sin credenciales Meta. Configura un número de WhatsApp primero.' });
      }

      // Fetch ALL templates from Meta
      let allMeta: any[] = [];
      let url = `https://graph.facebook.com/v25.0/${waNumber.waba_id}/message_templates?limit=100&fields=name,status,language,category,components`;
      
      while (url) {
        const metaRes = await fetch(url, {
          headers: { 'Authorization': `Bearer ${waNumber.access_token}` }
        });
        const metaData = await metaRes.json();
        if (metaData.error) throw new Error(metaData.error.message);
        allMeta = allMeta.concat(metaData.data || []);
        url = metaData.paging?.next || '';
      }

      // Get local templates
      const { data: localTemplates } = await supabase
        .from('store_templates')
        .select('*')
        .eq('store_id', storeId as string);

      const localNames = new Set((localTemplates || []).map(t => t.template_name));
      const approved = allMeta.filter(t => t.status === 'APPROVED');
      const newToAdd = approved.filter(t => !localNames.has(t.name));

      let addedCount = 0;
      if (newToAdd.length > 0) {
        const records = newToAdd.map(t => ({
          store_id: storeId as string,
          template_name: t.name,
          template_type: classifyTemplate(t.name, t.category),
          is_active: true,
          sent_count: 0,
          conversion_count: 0
        }));

        const { data: inserted } = await supabase.from('store_templates').insert(records).select();
        addedCount = inserted?.length || 0;
      }

      return res.status(200).json({
        success: true,
        synced: addedCount,
        total_meta: allMeta.length,
        total_approved: approved.length,
        total_local: (localTemplates?.length || 0) + addedCount,
        results: newToAdd.map(t => ({ name: t.name, status: t.status, actions: ['✅ Importada desde Meta'] }))
      });
    }

    // ==========================================
    // DELETE: Delete a template (local only — Meta templates persist)
    // ==========================================
    if (req.method === 'DELETE') {
      const { templateId } = req.query;
      if (!templateId) return res.status(400).json({ error: 'Falta templateId' });

      await supabase.from('store_templates').delete().eq('id', templateId as string);
      return res.status(200).json({ success: true, message: 'Plantilla eliminada de Chatify.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Meta Templates API Error:', error);
    return res.status(500).json({ error: error.message, details: error });
  }
}

// Helper to classify template names into types
function classifyTemplate(name: string, category: string): string {
  const n = name.toLowerCase();
  if (n.includes('carrito') || n.includes('cart') || n.includes('abandonad')) {
    if (n.includes('final') || n.includes('_3')) return 'recuperar_carrito_t3';
    if (n.includes('recordatorio') || n.includes('_2')) return 'recuperar_carrito_t2';
    return 'recuperar_carrito_t1';
  }
  if (n.includes('confirmacion') || n.includes('confirmaciones')) {
    if (n.includes('recordatorio') || n.includes('seguimiento')) return 'confirmation_reminder';
    return 'order_confirmation';
  }
  if (n.includes('seguimiento') || n.includes('tracking')) return 'tracking';
  if (n.includes('novedad')) return 'issue_delivery';
  return 'custom';
}
