import twilio from 'twilio';

export default async function handler(req: any, res: any) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Fetch recent messages
    const messages = await client.messages.list({ limit: 10 });
    
    const report = messages.map(m => ({
      sid: m.sid,
      date: m.dateCreated,
      to: m.to,
      status: m.status,
      error_code: m.errorCode,
      error_message: m.errorMessage,
      body: m.body
    }));
    
    res.status(200).json({
      success: true,
      messages: report
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
