import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const messages = await client.messages.list({ limit: 5 });
    
    return res.status(200).json({
      success: true,
      messages: messages.map(m => ({
        to: m.to,
        status: m.status,
        errorCode: m.errorCode,
        errorMessage: m.errorMessage,
        dateCreated: m.dateCreated
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
