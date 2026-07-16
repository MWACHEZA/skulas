const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, 'src'), function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it has the specific broken syntax
    // This matches: if (!(await toastConfirm('...')) return;
    const brokenRegex = /if \(!\(await toastConfirm\((.*?)\)\)\s+return;/g;
    
    if (brokenRegex.test(content)) {
      console.log(`Fixing syntax in ${filePath}`);
      content = content.replace(brokenRegex, 'if (!(await toastConfirm($1))) return;');
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
