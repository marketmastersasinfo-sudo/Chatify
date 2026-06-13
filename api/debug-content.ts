import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const content = await client.content.v1.contents('HXdc371dc5e901367d81caf7bf0c421311').fetch();
    return res.status(200).json({ success: true, content });
  } catch (e: any) {
    return res.status(500).json({ error: e.message, code: e.code });
  }
}
