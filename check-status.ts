import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function check() {
  const messages = await client.messages.list({ limit: 5 });
  messages.forEach(m => {
    console.log(`To: ${m.to}, Status: ${m.status}, ErrorCode: ${m.errorCode}, ErrorMessage: ${m.errorMessage}`);
  });
}
check();
