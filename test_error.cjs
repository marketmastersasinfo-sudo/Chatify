const data = {
  object: "test",
  message: "Give me the error"
};

fetch('https://chatify-teal-xi.vercel.app/api/meta-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
.then(res => res.text().then(text => ({ status: res.status, text })))
.then(console.log)
.catch(console.error);
