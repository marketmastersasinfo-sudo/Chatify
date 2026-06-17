import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
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
    const { data: lead } = await supabase.from('leads').select('phone, store_id').eq('id', leadId).single();
    if (!lead || !lead.phone) return res.status(404).json({ error: 'Lead not found or no phone' });

    const { data: store } = await supabase.from('stores').select('twilio_phone_number').eq('id', lead.store_id).single();
    if (!store || !store.twilio_phone_number) return res.status(400).json({ error: 'Store configuration missing Twilio Phone Number' });

    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Sanitize from number
    let fromNumber = store.twilio_phone_number.trim().replace(/ /g, '').replace('whatsapp:', '');
    if (!fromNumber.startsWith('+')) fromNumber = `+${fromNumber}`;
    fromNumber = `whatsapp:${fromNumber}`;

    // Sanitize to number
    let toNumber = lead.phone.trim().replace(/ /g, '').replace('whatsapp:', '');
    if (!toNumber.startsWith('+')) toNumber = `+${toNumber}`;
    toNumber = `whatsapp:${toNumber}`;

    if (action === 'message') {
      if (!message) return res.status(400).json({ error: 'Missing message' });

      const messageResult = await twilioClient.messages.create({
        from: fromNumber,
        to: toNumber,
        body: message,
      });

      return res.status(200).json({ success: true, messageId: messageResult.sid });
    }

    if (action === 'template') {
      if (!templateType && !templateId) return res.status(400).json({ error: 'Missing templateType or templateId' });

      let template;
      if (templateId) {
        const { data } = await supabase.from('store_templates').select('twilio_content_sid, template_name').eq('id', templateId).single();
        template = data;
      } else {
        const { data } = await supabase.from('store_templates').select('twilio_content_sid, template_name').eq('store_id', lead.store_id).eq('template_type', templateType).single();
        template = data;
      }

      if (!template || !template.twilio_content_sid) return res.status(400).json({ error: 'Store has no template configured.' });

      let rawText = '';
      let templateVariablesKeys: string[] = [];
      let types: any = {};
      try {
        const content = await twilioClient.content.v1.contents(template.twilio_content_sid).fetch();
        types = content.types as any;
        rawText = types['twilio/text']?.body || types['twilio/media']?.body || types['twilio/quick-reply']?.body || '';
        const variableMatches = [...rawText.matchAll(/\{\{(\d+)\}\}/g)];
        const variablesSet = new Set<string>();
        variableMatches.forEach(match => variablesSet.add(match[1]));
        if (content.variables) Object.keys(content.variables).forEach(k => variablesSet.add(k));
        templateVariablesKeys = Array.from(variablesSet);
      } catch (e) { console.error('Error fetching template', e); }

      const contentVariables: any = {};
      if (variables) {
        for (const key of templateVariablesKeys) {
          const val = variables[key];
          if (val !== undefined && val !== null && String(val).trim() !== '') contentVariables[key] = String(val).trim();
        }
      }

      let bodyText = rawText || `[Plantilla Meta Enviada: ${template.template_name}]`;
      for (const key of Object.keys(contentVariables)) bodyText = bodyText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), contentVariables[key]);

      // Extraer botones interactivos de la plantilla
      const buttons: string[] = [];
      if (types['twilio/quick-reply']?.actions) {
        for (const action of types['twilio/quick-reply'].actions) {
          buttons.push(action.title || action.body || '');
        }
      }
      if (types['twilio/call-to-action']?.actions) {
        for (const action of types['twilio/call-to-action'].actions) {
          buttons.push(action.title || action.url || '');
        }
      }
      if (types['twilio/list-picker']?.items) {
        for (const item of types['twilio/list-picker'].items) {
          buttons.push(item.item || item.id || '');
        }
      }
      // Concatenar botones al cuerpo del mensaje para visualización
      if (buttons.length > 0) {
        bodyText += '\n\n' + buttons.map(b => `[BTN] ${b}`).join('\n');
      }

      const messageResult = await twilioClient.messages.create({
        from: fromNumber,
        to: toNumber,
        contentSid: template.twilio_content_sid,
        contentVariables: Object.keys(contentVariables).length > 0 ? JSON.stringify(contentVariables) : undefined,
      });

      await supabase.from('messages').insert({ lead_id: leadId, sender_type: 'human', content: bodyText });
      return res.status(200).json({ success: true, messageId: messageResult.sid, bodyText });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    let userFriendlyError = error.message || 'Unknown error';
    if (userFriendlyError.includes('63016') || userFriendlyError.includes('Outside messaging window')) {
      userFriendlyError = 'WhatsApp bloqueó este mensaje. Han pasado más de 24 horas.';
    }
    if (req.body?.leadId) await supabase.from('messages').insert({ lead_id: req.body.leadId, sender_type: 'ai', content: `[ERROR DE ENVÍO] ${userFriendlyError}` });
    return res.status(500).json({ error: error.message });
  }
}
