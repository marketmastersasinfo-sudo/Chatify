const https = require('https');

const postData = new URLSearchParams({
    From: 'whatsapp:+573182533893',
    To: 'whatsapp:+18106666654',
    Body: 'Prueba 7 desde script',
    MessageSid: 'SM123',
    ProfileName: 'Felipe'
}).toString();

const options = {
    hostname: 'chatify-teal-xi.vercel.app',
    port: 443,
    path: '/api/twilio-webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
