const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith('.') || file === 'node_modules' || file === '$RECYCLE.BIN') continue;
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          await searchFiles(filePath, fileList);
        } else if (file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.cjs') || file.endsWith('.sql')) {
          fileList.push(filePath);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return fileList;
}

async function main() {
  console.log('===========================================================');
  console.log('BÚSQUEDA COMPLETA DE TODAS LAS FAN PAGES EN EL SISTEMA');
  console.log('===========================================================\n');

  // 1. Check Supabase connected_pages
  const { data: dbPages } = await supabase.from('connected_pages').select('*');
  console.log(`📌 En la base de datos Supabase (\`connected_pages\`) hay ${dbPages ? dbPages.length : 0} páginas:`);
  if (dbPages) {
    dbPages.forEach(p => console.log(`   - ${p.page_name} (ID: ${p.page_id})`));
  }

  // 2. Search local files on Desktop, OneDrive, Brain, Scratch
  const searchDirs = [
    'C:\\Users\\felip\\OneDrive\\Desktop',
    'C:\\Users\\felip\\.gemini\\antigravity-ide\\brain',
    'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch'
  ];

  const allFiles = [];
  for (const d of searchDirs) {
    await searchFiles(d, allFiles);
  }

  console.log(`\n🔍 Analizados ${allFiles.length} archivos locales...\n`);

  const pageNamesFound = new Set();
  const pageRegex = /(?:PÁGINA|Página|Fan Page|Fanpage|page_name):\s*([^\r\n]+)/gi;

  for (const f of allFiles) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      let match;
      while ((match = pageRegex.exec(content)) !== null) {
        pageNamesFound.add(match[1].trim());
      }
    } catch (e) {}
  }

  console.log(`🎉 TODAS LAS FAN PAGES ENCONTRADAS EN ARCHIVOS Y DOCUMENTOS:`);
  Array.from(pageNamesFound).sort().forEach((name, idx) => {
    console.log(`   ${idx + 1}. ${name}`);
  });
}

main();
