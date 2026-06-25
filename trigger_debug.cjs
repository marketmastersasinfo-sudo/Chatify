fetch('https://chatify-teal-xi.vercel.app/api/debug-reply')
.then(res => res.text().then(text => ({ status: res.status, text })))
.then(console.log)
.catch(console.error);
