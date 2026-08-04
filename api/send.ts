import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { action, leadId, message, templateType, variables, templateId } = req.body;

  if (!leadId) return res.status(400).json({ error: 'Missing leadId' });

  try {
    const { data: lead } = await supabase.from('leads').select('phone, store_id, board_type, status, social_platform').eq('id', leadId).single();
    if (!lead || !lead.phone) return res.status(404).json({ error: 'Lead not found or no phone' });

    if (lead.social_platform === 'facebook' || lead.social_platform === 'instagram') {
      const { data: pageData } = await supabase.from('connected_pages').select('page_id, access_token').eq('store_id', lead.store_id).limit(1).single();
      if (!pageData) return res.status(400).json({ error: 'No Facebook/Instagram page connected to this store' });
      
      if (action === 'message') {
        if (!message) return res.status(400).json({ error: 'Missing message' });
        const { sendMessengerText } = await import('./utils/_meta-messenger.js');
        const metaRes = await sendMessengerText({
          pageId: pageData.page_id,
          pageToken: pageData.access_token,
          to: lead.phone
        }, message);
        return res.status(200).json({ success: true, messageId: metaRes?.message_id || 'messenger-msg-id' });
      } else {
        return res.status(400).json({ error: 'Templates are not natively supported in Messenger/Instagram within this flow' });
      }
    }

    // Get Meta credentials from whatsapp_numbers (not from stores)
    const { data: waNumber } = await supabase
      .from('whatsapp_numbers')
      .select('phone_number_id, access_token, waba_id')
      .eq('store_id', lead.store_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    // Fallback: if no active number, try any number for the store
    let phoneNumberId = waNumber?.phone_number_id;
    let accessToken = waNumber?.access_token;

    if (!phoneNumberId || !accessToken) {
      const { data: fallbackNumber } = await supabase
        .from('whatsapp_numbers')
        .select('phone_number_id, access_token, waba_id')
        .eq('store_id', lead.store_id)
        .limit(1)
        .single();
      
      if (!fallbackNumber?.phone_number_id || !fallbackNumber?.access_token) {
        return res.status(400).json({ error: 'No WhatsApp number configured for this store' });
      }
      phoneNumberId = fallbackNumber.phone_number_id;
      accessToken = fallbackNumber.access_token;
    }

    if (action === 'message') {
      if (!message) return res.status(400).json({ error: 'Missing message' });

      const { sendMetaText } = await import('./utils/_meta-whatsapp.js');
      const metaRes = await sendMetaText({
        phoneNumberId,
        accessToken,
        to: lead.phone
      }, message);
      const messageId = metaRes.messages?.[0]?.id || 'meta-msg-id';

      return res.status(200).json({ success: true, messageId });
    }

    if (action === 'template') {
      if (!templateType && !templateId) return res.status(400).json({ error: 'Missing templateType or templateId' });

      let template: any;
      if (templateId) {
        const { data } = await supabase.from('store_templates').select('id, template_name, sent_count').eq('id', templateId).single();
        template = data;
      } else {
        const { data } = await supabase
          .from('store_templates')
          .select('id, template_name, sent_count')
          .eq('store_id', lead.store_id)
          .eq('template_type', templateType)
          .eq('is_active', true);
        
        if (!data || data.length === 0) {
          const { data: fallback } = await supabase
            .from('store_templates')
            .select('id, template_name, sent_count')
            .eq('store_id', lead.store_id)
            .eq('template_type', templateType)
            .limit(1)
            .single();
          template = fallback;
        } else {
          // A/B Testing: Elegir una al azar
          template = data[Math.floor(Math.random() * data.length)];
        }
      }

      if (!template?.template_name) return res.status(400).json({ error: 'No template found for this store' });

      // Build Meta template variables
      const contentVariables: Record<string, string> = {};
      if (variables) {
        for (const [key, val] of Object.entries(variables)) {
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            contentVariables[key] = String(val).trim();
          }
        }
      }

      // Build body text for logging
      let bodyText = `[Plantilla Meta: ${template.template_name}]`;
      for (const [key, val] of Object.entries(contentVariables)) {
        bodyText += ` {{${key}}}=${val}`;
      }

      // Send via Meta API
      const { sendMetaTemplate } = await import('./utils/_meta-whatsapp.js');
      const components = [];
      // Extract only numeric keys for Meta's positional parameters (1, 2, 3...)
      const numericKeys = Object.keys(contentVariables)
        .filter(k => !isNaN(Number(k)))
        .sort((a, b) => Number(a) - Number(b));

      if (numericKeys.length > 0) {
        const parameters = numericKeys.map(k => ({
          type: 'text',
          text: contentVariables[k]
        }));
        components.push({
          type: 'body',
          parameters
        });
      }
      
      const metaRes = await sendMetaTemplate({
        phoneNumberId,
        accessToken,
        to: lead.phone
      }, template.template_name, 'es', components);
      
      const messageId = metaRes.messages?.[0]?.id || 'meta-tpl-id';

      // Fetch the real template body from Meta API and render with variables
      const wabaId = waNumber?.waba_id || '';
      let renderedPreview = '';
      if (wabaId) {
        try {
          const tplUrl = `https://graph.facebook.com/v25.0/${wabaId}/message_templates?name=${encodeURIComponent(template.template_name)}&fields=components`;
          const tplResp = await fetch(tplUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
          const tplData = await tplResp.json();
          const tpl = tplData.data?.[0];
          if (tpl) {
            const bodyComp = tpl.components?.find((c: any) => c.type === 'BODY');
            if (bodyComp?.text) {
              renderedPreview = bodyComp.text.replace(/\{\{(\d+)\}\}/g, (_: string, num: string) => {
                return contentVariables[num] || `{{${num}}}`;
              });
            }
          }
        } catch (e) {
          // Non-fatal
        }
      }

      // Build the body text — include rendered preview for the frontend
      if (renderedPreview) {
        bodyText += `\n---PREVIEW---\n${renderedPreview}`;
      }

      // Log in messages table
      await supabase.from('messages').insert({
        lead_id: leadId,
        sender_type: 'human',
        content: bodyText,
        template_id: template.id
      });

      if (lead.board_type === 'logistics' && lead.status === 'nuevo') {
        await supabase.from('leads').update({ status: 'confirmation_sent' }).eq('id', leadId);
      }

      // Update sent count
      if (template) {
        await supabase.from('store_templates').update({ sent_count: (template.sent_count || 0) + 1 }).eq('id', template.id);
      }

      return res.status(200).json({ success: true, messageId });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    let userFriendlyError = error.message || 'Unknown error';
    if (userFriendlyError.includes('Outside messaging window') || userFriendlyError.includes('Re-engagement message')) {
      userFriendlyError = 'WhatsApp bloqueó este mensaje. Han pasado más de 24 horas. Necesitas enviar una plantilla primero.';
    }
    if (req.body?.leadId) await supabase.from('messages').insert({ lead_id: req.body.leadId, sender_type: 'ai', content: `[ERROR DE ENVÍO] ${userFriendlyError}` });
    return res.status(500).json({ error: error.message });
  }
}
