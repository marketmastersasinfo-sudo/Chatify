const fs = require('fs');

const file1 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\luz_angela_v3.txt';
const file2 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\paula_rojas_v3.txt';

const content1 = fs.readFileSync(file1, 'utf8');
const content2 = fs.readFileSync(file2, 'utf8');

console.log('===========================================================');
console.log('TODOS LOS REGISTROS DE YAENCASA EN LUZ ANGELA Y PAULA');
console.log('===========================================================\n');

const lines1 = content1.split('\n');
lines1.forEach(l => {
  if (l.toLowerCase().includes('yaencasa') || l.toLowerCase().includes('ofertazo')) {
    console.log('[Luz Angela]', l.trim());
  }
});

const lines2 = content2.split('\n');
lines2.forEach(l => {
  if (l.toLowerCase().includes('yaencasa') || l.toLowerCase().includes('ofertazo')) {
    console.log('[Paula]', l.trim());
  }
});
