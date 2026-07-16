import fs from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';

const files = [
  'departments', 'apply', 'check-status',
  'gallery', 'news', 'sports', 'clubs', 'contact'
];

let globalExtraCSS = '';

files.forEach(name => {
  const file = `${name}.html`;
  const html = fs.readFileSync(`legacy/${file}`, 'utf8');
  const $ = cheerio.load(html);
  
  $('.top-bar').remove();
  $('header').remove();
  $('footer').remove();
  $('script').remove();
  
  $('style').each((i, el) => {
    globalExtraCSS += $(el).html() + '\n';
  });
  $('style').remove();
  
  let bodyContent = $('body').html() || '';
  
  // React JSX conversions
  bodyContent = bodyContent.replace(/class=/g, 'className=')
                           .replace(/for=/g, 'htmlFor=')
                           .replace(/charset=/g, 'charSet=');
  
  // Convert standard HTML links to React Router links. Cheerio can't easily change tag name to Link preserving innerHTML so doing regex.
  bodyContent = bodyContent.replace(/<a([^>]*)href="([^"]+)\.html"([^>]*)>/g, '<Link$1to="/$2"$3>');
  bodyContent = bodyContent.replace(/<a([^>]*)href="index\.html"([^>]*)>/g, '<Link$1to="/"$3>');
  
  // Self-closing tags fix
  bodyContent = bodyContent.replace(/<img(.*?[^\/])>/g, '<img$1 />')
                           .replace(/<input(.*?[^\/])>/g, '<input$1 />')
                           .replace(/<br(.*?[^\/])>/g, '<br$1 />')
                           .replace(/<source(.*?[^\/])>/g, '<source$1 />')
                           .replace(/<hr(.*?[^\/])>/g, '<hr$1 />');
                           
  // Quick inline style hack for departments display grid fix
  bodyContent = bodyContent.replace(/style="display: grid; grid-template-columns: repeat\(auto-fit, minmax\(300px, 1fr\)\); gap: 30px; margin-top: 40px;"/g, "style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '40px' }}");
  
  // Other potential inline styles - wrap in dangerouslySetInnerHTML or remove. Most are simple.
  
  const componentName = name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  
  const compStr = `import { Link } from 'react-router-dom';\n\nexport default function ${componentName}() {\n  return (\n    <>\n      ${bodyContent}\n    </>\n  );\n}\n`;
  
  fs.writeFileSync(`src/pages/${componentName}.tsx`, compStr);
  console.log(`Generated ${componentName}.tsx`);
});

fs.appendFileSync('src/assets/css/style.css', '\n\n/* Extracted Inline Styles from Migration */\n' + globalExtraCSS);
console.log('Appended extra CSS.');
