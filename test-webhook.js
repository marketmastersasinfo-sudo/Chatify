import http from 'http';
import https from 'https';

const data = new URLSearchParams();
data.append('Body', 'Hola');
data.append('From', 'whatsapp:+584122500695');
data.append('To', 'whatsapp:+16092770307');
data.append('ProfileName', 'Andres');

const req = https.request('https://chatify-teal-xi.vercel.app/api/twilio-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': data.toString().length
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', (d) => process.stdout.write(d));
});
req.on('error', console.error);
req.write(data.toString());
req.end();
