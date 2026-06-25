const data = {
  object: "page",
  entry: [
    {
      id: "DEBUG_CURL_TEST",
      time: 1234567890,
      changes: [
        {
          value: {
            from: { id: "123", name: "Tester" },
            item: "comment",
            post_id: "post123",
            comment_id: "comment123",
            verb: "add",
            created_time: 1234567890,
            message: "Test Flytrap"
          },
          field: "feed"
        }
      ]
    }
  ]
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
