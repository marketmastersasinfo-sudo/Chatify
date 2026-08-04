const fs = require('fs');

const path1 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\luz_angela_v3.txt';
const path2 = 'C:\\Users\\felip\\.gemini\\antigravity-ide\\scratch\\meta-dashboard\\paula_rojas_v3.txt';

console.log('=== LUZ ANGELA V3 FILE ===');
if (fs.existsSync(path1)) {
  const content = fs.readFileSync(path1, 'utf8');
  console.log(content);
}

console.log('\n=== PAULA ROJAS V3 FILE ===');
if (fs.existsSync(path2)) {
  const content = fs.readFileSync(path2, 'utf8');
  console.log(content);
}
