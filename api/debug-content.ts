import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const balance = await client.request({
      method: 'GET',
      uri: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Balance.json`
    });
    
    const usage = await client.request({
      method: 'GET',
      uri: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Usage/Records/Today.json`
    });
    
    return res.status(200).json({ success: true, balance: balance.body, usage: usage.body });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
