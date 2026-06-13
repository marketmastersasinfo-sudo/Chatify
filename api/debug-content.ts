import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const approvals = await client.request({
      method: 'GET',
      uri: 'https://content.twilio.com/v1/Content/HXdc371dc5e901367d81caf7bf0c421311/ApprovalRequests'
    });
    
    return res.status(200).json({ success: true, approvals: approvals.body });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
