const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (content.includes('<table')) {
     const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/g;
     content = content.replace(tableRegex, (match) => {
         return `<div className="overflow-x-auto w-full min-w-full"><div className="min-w-max">\n          ${match}\n        </div></div>`;
     });
     changed = true;
  }

  const glassRegex = /(<div[^>]*className="[^"]*?)overflow-hidden([^"]*?")/g;
  content = content.replace(glassRegex, (match, p1, p2) => {
     changed = true;
     return `${p1}overflow-auto resize-y${p2}`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
