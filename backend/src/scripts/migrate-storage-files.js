const fs = require('fs');
const path = require('path');

const storageRoot = path.join(__dirname, '../../storage');
const targetSchool = 'AX-EMBAKWE';
const targetGlobal = path.join(storageRoot, targetSchool, 'global');

const orphanedFolders = [
    'images',
    'signatures',
    'docs',
    'assignments',
    'submissions',
    'profiles'
];

function moveFolderContents(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const items = fs.readdirSync(src);
    items.forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        
        if (fs.existsSync(destPath)) {
            console.log(`Conflict: ${destPath} already exists. Skipping.`);
        } else {
            fs.renameSync(srcPath, destPath);
            console.log(`Moved: ${srcPath} -> ${destPath}`);
        }
    });
}

orphanedFolders.forEach(folder => {
    const srcPath = path.join(storageRoot, folder);
    const destPath = path.join(targetGlobal, folder);
    moveFolderContents(srcPath, destPath);
});

console.log('Orphaned root folders migrated to institutional vault.');
