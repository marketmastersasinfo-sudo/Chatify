import fetch from 'node-fetch';

const url = 'https://chatify-teal-xi.vercel.app/api/meta-webhook';

const payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "723025644229688",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "573224092420",
              "phone_number_id": "723025644229688"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Test User"
                },
                "wa_id": "573182533893"
              }
            ],
            "messages": [
              {
                "from": "573182533893",
                "id": "wamid.HBgLNTczMTgyNTMzODkzFQIAEhgWMUVCQkQ1MkFDM0E4M0JERTJFNkMyOQA=",
                "timestamp": "1700000000",
                "text": {
                  "body": "Hola, esto es una prueba desde el script de depuración"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
