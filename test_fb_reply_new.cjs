const token = "EAAWIZA3iODpoBR43qZCWt8DFR7sx40uUmlz0lwqkAfglQCUweoFCzsZCZBbjYeRtljMT3CfAicnUQ3CgzCGtGTs0y6I4qHbLMXgUAmQvj0IVVufp4TZB7aMZAFvDGvNVVw4o9EJuJF4TpV8Ta6iaWD3kx4SZBqpRuZASiZA3iYAQeSPJZAWsgBzAX42KUXyqpcU8V3f9cucDck8vZAMWTSHusKpYVqRBFMK67gYLIiKYNe03WZBM1C3wnyMiHZAjDadqABm79MTNoviYxa1tyIOUZD";
const commentId = "122105147468195650_1020309737028355";
const message = "Respuesta automatica (Simulado)";

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
