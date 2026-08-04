const fs = require('fs');

const file = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\brain\\671bdf16-9962-4966-b815-9a51a9bb07f9\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(file, 'utf8').split('\n');
let count = 0;
for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    if (data.type === 'USER_INPUT' && data.content.includes('Identificador de la aplicación')) {
      console.log(data.content);
    }
    if (data.type === 'USER_INPUT' && data.content.includes('Clave secreta')) {
      console.log(data.content);
    }
    if (data.type === 'USER_INPUT' && data.content.match(/\b\d{15,16}\b/)) {
        // App ID is usually 15 or 16 digits
        console.log("Found numbers:", data.content.substring(0, 200));
    }
  } catch(e) {}
}
