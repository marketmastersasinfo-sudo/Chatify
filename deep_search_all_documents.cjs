const fs = require('fs');
const path = require('path');

const desktopDirs = [
  'C:\\Users\\felip\\OneDrive\\Desktop',
  'C:\\Users\\felip\\Desktop',
  'C:\\Users\\felip\\.gemini\\antigravity-ide\\brain',
  'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch'
];

function getAllFiles(dir, files = []) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file.startsWith('.') || file === 'node_modules' || file === '$RECYCLE.BIN') continue;
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          getAllFiles(filePath, files);
        } else if (file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.cjs') || file.endsWith('.js') || file.endsWith('.sql')) {
          files.push(filePath);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return files;
}

async function main() {
  console.log('===========================================================');
  console.log('BÚSQUEDA PROFUNDA DE DOCUMENTOS DE FAN PAGES EN TODO EL DISCO');
  console.log('===========================================================\n');

  let allFiles = [];
  for (const d of desktopDirs) {
    getAllFiles(d, allFiles);
  }

  console.log(`Total archivos de texto/md a inspeccionar: ${allFiles.length}\n`);

  const matches = [];

  for (const file of allFiles) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes('Fan Page') || text.includes('Fanpage') || text.includes('Facebook Page') || text.includes('Páginas de Facebook') || text.includes('connected_pages')) {
        matches.push(file);
      }
    } catch (e) {}
  }

  console.log(`📌 Encontrados ${matches.length} archivos que mencionan Fan Pages:\n`);

  for (const m of matches) {
    console.log(`📄 Archivo: ${m}`);
    const text = fs.readFileSync(m, 'utf8');
    const lines = text.split('\n').filter(l => l.toLowerCase().includes('page') || l.toLowerCase().includes('fan') || l.toLowerCase().includes('facebook') || l.toLowerCase().includes('pagina') || l.toLowerCase().includes('tienda'));
    console.log(`   Líneas relevantes (${lines.length}):`);
    lines.slice(0, 15).forEach(l => console.log(`     > ${l.substring(0, 120)}`));
    console.log('-----------------------------------------------------------');
  }
}

main();
