const https = require('https');

const data = JSON.stringify({
  "object": "page",
  "entry": [
    {
      "id": "240543465799764",
      "time": 1234567890,
      "changes": [
        {
          "value": {
            "from": {
              "id": "123456",
              "name": "Test User"
            },
            "item": "comment",
            "post_id": "240543465799764_999999",
            "comment_id": "240543465799764_888888",
            "verb": "add",
            "created_time": 1234567890,
            "message": "Hola, prueba técnica simulada"
          },
          "field": "feed"
        }
      ]
    }
  ]
});

const options = {
  hostname: 'chatify-teal-xi.vercel.app',
  port: 443,
  path: '/api/meta-webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();
