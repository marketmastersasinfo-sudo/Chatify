import fetch from 'node-fetch';

const url = 'https://graph.facebook.com/v25.0/723025644229688';
const token = 'EAAH5fjPTu2gBRw6hvI0m8ZCe25hTtVaIWY08fEwTejH4du0F42XUnfVSRCtxXRZBjZAlrp0TI597oifZAOudUdcFose5ng0AfekZASkYZAB3q4J8BfpjvwQ2g0LJYmLjwBptm9DCJSry2ZCkBH3QR0oko00wUGGv0axSnR8Oaxp5s9LwYMZAcTKH5ghBIhZC97KfXJQZDZD';

fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log('Phone Data:', JSON.stringify(data, null, 2)))
.catch(err => console.error('Error:', err));
