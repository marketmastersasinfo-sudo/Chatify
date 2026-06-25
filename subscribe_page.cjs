const https = require('https');
const url = "https://graph.facebook.com/v25.0/240543465799764/subscribed_apps?subscribed_fields=feed&access_token=EAAWIZA3iODpoBRyfRHOcjScJHNHyN1SqniVH6WO1YLEkdF4ZBUx7FvFf8lfhkrZAsAjaA5ctHq5cVo0ilglppQvKlcSJ4QsMQFXM9rtg9onMLvxv5OPeRgY9h378rUni29aAvi6ZAEZCJ3vjcTxWHuZA05CU4ujKtzCBZAOQDUUS0XniAW2oXXMY3pDAI1kWohLGJK863vvmrZAa7EfTtI21yTZCBnMDCkOZAsZAgGtOgZDZD";

const req = https.request(url, { method: 'POST' }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
  });
});
req.on('error', console.error);
req.end();
