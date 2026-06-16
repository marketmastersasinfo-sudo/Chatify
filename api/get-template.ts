import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  
  const { templateId } = req.query;
  if (!templateId) return res.status(400).json({ error: 'Missing templateId' });

  try {
    const { data: template } = await supabase.from('store_templates').select('twilio_content_sid, template_name').eq('id', templateId).single();
    if (!template || !template.twilio_content_sid) return res.status(404).json({ error: 'Template not found' });

    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const content = await twilioClient.content.v1.contents(template.twilio_content_sid).fetch();
    
    const types = content.types as any;
    const rawText = types['twilio/text']?.body || types['twilio/media']?.body || types['twilio/quick-reply']?.body || '';
    
    // Extraer variables usando regex {{1}}, {{2}}, etc.
    const variableMatches = [...rawText.matchAll(/\{\{(\d+)\}\}/g)];
    const variablesSet = new Set<string>();
    variableMatches.forEach(match => variablesSet.add(match[1]));
    
    // Si Twilio reporta variables, también las sumamos por si acaso
    if (content.variables) {
      Object.keys(content.variables).forEach(k => variablesSet.add(k));
    }
    
    const variables = Array.from(variablesSet).sort((a, b) => parseInt(a) - parseInt(b));

    return res.status(200).json({
      success: true,
      template_name: template.template_name,
      body: rawText,
      variables: variables
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
