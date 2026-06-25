const token = "EAAWIZA3iODpoBRyfRHOcjScJHNHyN1SqniVH6WO1YLEkdF4ZBUx7FvFf8lfhkrZAsAjaA5ctHq5cVo0ilglppQvKlcSJ4QsMQFXM9rtg9onMLvxv5OPeRgY9h378rUni29aAvi6ZAEZCJ3vjcTxWHuZA05CU4ujKtzCBZAOQDUUS0XniAW2oXXMY3pDAI1kWohLGJK863vvmrZAa7EfTtI21yTZCBnMDCkOZAsZAgGtOgZDZD";
const commentId = "122105147468195650_1020309737028355";
const message = "Respuesta de prueba desde el robot fantasma";

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
