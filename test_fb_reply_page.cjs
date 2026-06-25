const token = "EAAWIZA3iODpoBR6DOfZCDvB83dZCM030G7vX1XUl9A9bFOOoJYgHtN2Hh9lpJa8v39I5g7uV73qzMyd9FWCZCxucuQIeLhyh5fUeHkx3QmSPSGFvBFlNtXTBQrirCehBCn3J1ZCL3NTJiNlsIveajLMSWSX9zZCgPw9aeLUxiTY5QwZA2kRGcOi2BoxwHYYDrtyeG8xVZClZCiyWYITfk2uas3lfg9CeDsyE9byXukgZBdDgZDZD";
const commentId = "122105147468195650_1020309737028355";
const message = "Respuesta automatica con el token correcto!";

fetch(`https://graph.facebook.com/v19.0/${commentId}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: message,
    access_token: token
  })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
