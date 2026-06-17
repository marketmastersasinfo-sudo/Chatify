import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const report: any = {
    templates: [],
    profile: null,
    recentMessages: [],
    errors: []
  };

  // 1. Fetch ALL content templates
  try {
    const contents = await twilioClient.content.v1.contents.list({ limit: 50 });
    for (const c of contents) {
      const types = c.types as any;
      const templateInfo: any = {
        sid: c.sid,
        friendlyName: c.friendlyName,
        language: c.language,
        dateCreated: c.dateCreated,
        body: null,
        buttons: [],
        hasButtons: false,
        templateType: 'unknown'
      };

      // Check all possible types
      if (types['twilio/quick-reply']) {
        templateInfo.templateType = 'quick-reply';
        templateInfo.body = types['twilio/quick-reply'].body || '';
        templateInfo.buttons = (types['twilio/quick-reply'].actions || []).map((a: any) => a.title || a.body || '');
        templateInfo.hasButtons = templateInfo.buttons.length > 0;
      } else if (types['twilio/call-to-action']) {
        templateInfo.templateType = 'call-to-action';
        templateInfo.body = types['twilio/call-to-action'].body || '';
        templateInfo.buttons = (types['twilio/call-to-action'].actions || []).map((a: any) => ({
          title: a.title,
          type: a.type,
          url: a.url,
          phone: a.phone
        }));
        templateInfo.hasButtons = templateInfo.buttons.length > 0;
      } else if (types['twilio/text']) {
        templateInfo.templateType = 'text-only';
        templateInfo.body = types['twilio/text'].body || '';
        templateInfo.hasButtons = false;
      } else if (types['twilio/media']) {
        templateInfo.templateType = 'media';
        templateInfo.body = types['twilio/media'].body || '';
        templateInfo.hasButtons = false;
      }

      // Also check for variables
      templateInfo.variables = c.variables || {};

      report.templates.push(templateInfo);
    }
  } catch (e: any) {
    report.errors.push({ section: 'templates', error: e.message });
  }

  // 2. Check recent outbound messages and their delivery status
  try {
    const messages = await twilioClient.messages.list({ limit: 15 });
    for (const m of messages) {
      report.recentMessages.push({
        direction: m.direction,
        to: m.to,
        from: m.from,
        status: m.status,
        errorCode: m.errorCode,
        errorMessage: m.errorMessage,
        dateSent: m.dateSent || m.dateCreated,
        bodyPreview: (m.body || '').substring(0, 100) + '...'
      });
    }
  } catch (e: any) {
    report.errors.push({ section: 'messages', error: e.message });
  }

  // 3. Check WhatsApp Business Profile
  try {
    // Try to get the WhatsApp sender profile
    const senders = await twilioClient.messaging.v1.services.list({ limit: 5 });
    report.messagingServices = senders.map(s => ({
      friendlyName: s.friendlyName,
      sid: s.sid,
      inboundRequestUrl: s.inboundRequestUrl
    }));
  } catch (e: any) {
    report.errors.push({ section: 'profile', error: e.message });
  }

  return res.status(200).json(report);
}
