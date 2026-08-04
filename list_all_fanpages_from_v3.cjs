const fs = require('fs');

const path1 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\luz_angela_v3.txt';
const path2 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\paula_rojas_v3.txt';

function extractPages(fileContent, owner) {
  const pages = [];
  const lines = fileContent.split('\n');
  let currentBM = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('Portafolio Comercial:') || line.includes('BM')) {
      currentBM = line;
    }
    
    // Look for lines like "Páginas de Facebook:" or "Página:" or "Propiedad de"
    if (line.includes('Páginas de Facebook') || line.includes('Página ID:') || line.includes('Propiedad de') || line.match(/^[0-9A-Za-z\s\.-]+\(Identificador:\s*\d+\)/)) {
      pages.push({ owner, bm: currentBM, text: line });
    }
  }
  return pages;
}

async function main() {
  console.log('===================================================================');
  console.log('LISTADO COMPLETO DE TODAS LAS FAN PAGES EN LOS DOCUMENTOS V3');
  console.log('===================================================================\n');

  const content1 = fs.readFileSync(path1, 'utf8');
  const content2 = fs.readFileSync(path2, 'utf8');

  // Regex to extract page names and IDs
  const pageRegex = /([A-Za-z0-9\s\.\-_@]+)\s*\(Identificador:\s*(\d+)\)/g;

  const luzPages = new Map();
  let match;
  while ((match = pageRegex.exec(content1)) !== null) {
    if (!match[1].includes('Pixel') && !match[1].includes('Cuenta') && !match[1].includes('Portafolio') && !match[1].includes('Socio') && !match[1].includes('Empresa')) {
      luzPages.set(match[2], match[1].trim());
    }
  }

  const paulaPages = new Map();
  while ((match = pageRegex.exec(content2)) !== null) {
    if (!match[1].includes('Pixel') && !match[1].includes('Cuenta') && !match[1].includes('Portafolio') && !match[1].includes('Socio') && !match[1].includes('Empresa')) {
      paulaPages.set(match[2], match[1].trim());
    }
  }

  console.log(`--- 🅰️ PERFIL DE FACEBOOK: LUZ ANGELA ---`);
  console.log(`Páginas encontradas en documentos de Luz Angela:`);
  Array.from(luzPages.entries()).forEach(([id, name], idx) => {
    console.log(`   ${idx + 1}. ${name} (ID: ${id})`);
  });

  console.log(`\n--- 🅱️ PERFIL DE FACEBOOK: PAULA ROJAS ---`);
  console.log(`Páginas encontradas en documentos de Paula Rojas:`);
  Array.from(paulaPages.entries()).forEach(([id, name], idx) => {
    console.log(`   ${idx + 1}. ${name} (ID: ${id})`);
  });
}

main();
