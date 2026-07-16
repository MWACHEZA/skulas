const fs = require('fs');
const path = require('path');

function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(filePath));
        } else { 
            results.push(filePath);
        }
    });
    return results;
}

const root = path.join(__dirname, '../../../');
const frontendSrc = path.join(root, 'frontend', 'src');
const backendSrc = path.join(root, 'backend', 'src');

console.log('Root:', root);
console.log('Frontend Src:', frontendSrc);
console.log('Backend Src:', backendSrc);

[frontendSrc, backendSrc].forEach(src => {
    if (!fs.existsSync(src)) {
        console.log(`Skipping: ${src} (Not found)`);
        return;
    }
    const files = walk(src);
    files.forEach(file => {
        if (!file.endsWith('.tsx') && !file.endsWith('.ts') && !file.endsWith('.js')) return;
        let content = fs.readFileSync(file, 'utf8');
        if (content.includes('storage')) {
            console.log(`Replacing in ${file}`);
            content = content.replace(/\/storage\//g, '/storage/')
                             .replace(/`storage\//g, '`storage/')
                             .replace(/'storage\//g, "'storage/")
                             .replace(/"storage\//g, '"storage/')
                             .replace(/storage\b/g, 'storage');
            fs.writeFileSync(file, content, 'utf8');
        }
    });
});
console.log('Migration complete.');
