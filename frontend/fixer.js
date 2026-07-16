import fs from 'fs';

const files = [
  'Departments', 'Apply', 'CheckStatus',
  'Gallery', 'News', 'Sports', 'Clubs', 'Contact'
];

files.forEach(name => {
  let content = fs.readFileSync(`src/pages/${name}.tsx`, 'utf8');
  
  // Strip string-based event handlers to avoid TS errors
  content = content.replace(/onClick="[^"]*"/g, "");
  content = content.replace(/onSubmit="[^"]*"/g, "");
  
  // Fix minor attributes
  content = content.replace(/maxlength="([^"]+)"/g, "maxLength={$1}");
  content = content.replace(/allowfullscreen(="")?/g, "allowFullScreen");
  
  fs.writeFileSync(`src/pages/${name}.tsx`, content);
});
console.log('Fixed pages.');
