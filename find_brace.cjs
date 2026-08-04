const fs = require('fs');
const lines = fs.readFileSync('src/pages/TemplateBuilder.tsx', 'utf8').split('\n');

let open = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') open++;
    if (line[j] === '}') open--;
  }
  if (open < 0) {
    console.log('Went negative at line:', i + 1);
    console.log(line);
    break;
  }
  if (open === 0 && i > 100) {
    console.log('Balance reached 0 at line:', i + 1);
    console.log(line);
    // break;
  }
}
