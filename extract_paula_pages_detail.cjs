const fs = require('fs');

const path = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\paula_rojas_v3.txt';
const content = fs.readFileSync(path, 'utf8');

console.log('===========================================================');
console.log('FAN PAGES EXTRAÍDAS DEL PERFIL DE PAULA ROJAS');
console.log('===========================================================\n');

const lines = content.split('\n');
let currentBM = '';

lines.forEach(l => {
  if (l.includes('Portafolio Comercial:') || l.includes('BM')) {
    currentBM = l.trim();
  }
  if (l.includes('Páginas de Facebook') || l.includes('Página ID:') || l.includes('Propiedad de')) {
    console.log(`BM: ${currentBM}`);
    console.log(`   ${l.trim()}`);
    console.log('-----------------------------------------------------------');
  }
});
