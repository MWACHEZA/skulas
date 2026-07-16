const fs = require('fs');
const path = require('path');
function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let newLines = lines.filter(line => !line.includes(`alert('An error occurred during this operation. Please try again or contact support.');`));
  let newContent = newLines.join('\n');
  if(newContent !== content) {
      fs.writeFileSync(file, newContent);
      console.log('Fixed', file);
  }
}
function traverse(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) traverse(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) fixFile(p);
  });
}
traverse(__dirname);
