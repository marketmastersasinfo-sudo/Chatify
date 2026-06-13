import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const messages = await client.messages.list({ limit: 15 });
    const logs = messages.map(m => ({
      sid: m.sid,
      to: m.to,
      from: m.from,
      status: m.status,
      error: m.errorMessage,
      code: m.errorCode,
      date: m.dateCreated
    }));
    return res.status(200).json({ success: true, logs });
  } catch (e: any) {
    return res.status(500).json({ error: e.message, code: e.code });
  }
}
