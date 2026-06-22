import twilio from 'twilio';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

const client = twilio(env['TWILIO_ACCOUNT_SID'], env['TWILIO_AUTH_TOKEN']);

async function check() {
  try {
    const messages = await client.messages.list({ limit: 10 });
    console.log("LAST 10 MESSAGES:");
    for (const msg of messages) {
      console.log(`SID: ${msg.sid}`);
      console.log(`Date: ${msg.dateCreated}`);
      console.log(`From: ${msg.from} | To: ${msg.to}`);
      console.log(`Direction: ${msg.direction}`);
      console.log(`Status: ${msg.status}`);
      console.log(`Error Code: ${msg.errorCode} | Error Message: ${msg.errorMessage}`);
      console.log(`Body: ${msg.body}`);
      console.log("------------------------");
    }
  } catch (e) {
    console.error(e);
  }
}
check();
