const fs = require('fs');

const file1 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\luz_angela_v3.txt';
const file2 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\paula_rojas_v3.txt';
const file3 = 'C:\\Users\\felip\\OneDrive\\Desktop\\Credenciales_Meta_Chatify.txt';

const allTexts = [
  { source: 'luz_angela_v3.txt (Luz Angela)', content: fs.readFileSync(file1, 'utf8') },
  { source: 'paula_rojas_v3.txt (Paula)', content: fs.readFileSync(file2, 'utf8') },
  { source: 'Credenciales_Meta_Chatify.txt', content: fs.readFileSync(file3, 'utf8') }
];

async function main() {
  console.log('================================================================');
  console.log('BÚSQUEDA ESPECÍFICA DE PÁGINAS: YAENCASA, UWASHOP, PRIMOS, PAPAYA');
  console.log('================================================================\n');

  const pageRegex = /([A-Za-z0-9\s\.\-_@]+)\s*\(Identificador:\s*(\d+)\)/g;

  for (const item of allTexts) {
    console.log(`📁 BUSCANDO EN: ${item.source}...`);
    let match;
    const found = [];
    while ((match = pageRegex.exec(item.content)) !== null) {
      const name = match[1].trim();
      const id = match[2];
      const lower = name.toLowerCase();
      if (lower.includes('yaencasa') || lower.includes('uwashop') || lower.includes('primo') || lower.includes('papaya') || lower.includes('yacompro') || lower.includes('compras')) {
        found.push({ name, id });
      }
    }

    if (found.length > 0) {
      found.forEach(p => console.log(`   • ${p.name} (ID: ${p.id})`));
    } else {
      console.log('   (Ninguna página con ese nombre en este archivo)');
    }
    console.log('----------------------------------------------------------------');
  }
}

main();
