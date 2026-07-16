const fs = require('fs');
const path = require('path');

// Go up to the backend root
const storageRoot = path.join(__dirname, '../../storage');
const schools = ['AX-EMBAKWE', 'AX-KHYVF4'];
const subFolders = [
    'global/images',
    'global/signatures',
    'global/docs',
    'global/assignments',
    'global/submissions',
    'finance/receipts',
    'academic/reports',
    'staff/avatars',
    'students/avatars'
];

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created: ${dir}`);
    }
}

schools.forEach(code => {
    subFolders.forEach(sub => {
        ensureDir(path.join(storageRoot, code, sub));
    });
});

console.log('Institutional directory silos created at:', storageRoot);
