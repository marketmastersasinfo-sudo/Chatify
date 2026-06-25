const fs = require('fs');
const https = require('https');

const userToken = 'EAAWIZA3iODpoBRzSowMN4zshpLTGJ7MCATuTxv1Qpzrr6Xv4HS1LcnFFWcNWUOUXiVoAgyrg42YYZCO5oWumujTikekDlInm96isgZBS3IfKR2QUn5AZA9tQL1fX1w4SEGEG5bHjsOArXkFvEye7Df8zbuspweZCTP1xNJO54EXsZBoO74Tl08OaiD3gJswQ0QwgK7ZAXKkC6SgLEvljQPCzR42FkI0MZAo2AP8p8zrSu2ZCMLrwrhVlVbKCuhpXYQ9BrcCExnePa3AVxU2sZD';

let allPages = [];

function fetchPages(url) {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      if (parsed.error) {
         console.error('API Error:', parsed.error);
         return;
      }
      if (parsed.data) {
        allPages = allPages.concat(parsed.data);
      }
      if (parsed.paging && parsed.paging.next) {
        fetchPages(parsed.paging.next);
      } else {
        savePages();
      }
    });
  }).on('error', (err) => {
    console.error('Network Error:', err);
  });
}

function savePages() {
  let content = '=======================================\n';
  content += '   TOKENS DE FAN PAGES - CHATIFY ENGINE\n';
  content += '=======================================\n\n';
  
  let yaencasa = null;

  allPages.forEach(page => {
    content += `PÁGINA: ${page.name}\n`;
    content += `ID: ${page.id}\n`;
    content += `TOKEN: ${page.access_token}\n`;
    content += `---------------------------------------\n\n`;
    
    if (page.name.toLowerCase() === 'yaencasa') {
        yaencasa = page;
    }
  });

  const paths = [
      'C:\\Users\\felip\\Desktop\\Tokens_FanPages.txt',
      'C:\\Users\\felip\\OneDrive\\Escritorio\\Tokens_FanPages.txt',
      'C:\\Users\\felip\\OneDrive\\Desktop\\Tokens_FanPages.txt',
      'C:\\Users\\felip\\Tokens_FanPages.txt'
  ];

  let saved = false;
  for (const p of paths) {
      try {
          fs.writeFileSync(p, content);
          console.log(`Archivo guardado exitosamente en: ${p}`);
          saved = true;
          break;
      } catch (e) {
          // continue
      }
  }

  if (!saved) {
      console.log('No se pudo guardar en el escritorio.');
  }

  console.log(`Total de páginas extraídas: ${allPages.length}`);
  if (yaencasa) {
      console.log('--- ENCONTRADO YAENCASA ---');
      console.log('ID=' + yaencasa.id);
      console.log('TOKEN=' + yaencasa.access_token);
  } else {
      console.log('No se encontró Yaencasa con ese nombre exacto.');
  }
}

fetchPages(`https://graph.facebook.com/v25.0/me/accounts?access_token=${userToken}&limit=100`);
