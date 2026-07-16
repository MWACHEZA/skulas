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
    
    // Fix onClick={() => { ... await toastConfirm ... }} to async
    const regex = /onClick=\{\(\) => \{(\s*if \(await toastConfirm)/g;
    
    if (regex.test(content)) {
      console.log(`Fixing async onClick in ${filePath}`);
      content = content.replace(regex, 'onClick={async () => {$1');
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
