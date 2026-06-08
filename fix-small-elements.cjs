const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix small elements that got resize-y
  const regex = /(className="[^"]*?(?:w-\d+|h-\d+|rounded-full)[^"]*?)overflow-auto resize-y([^"]*?")/g;
  content = content.replace(regex, (match, p1, p2) => {
     changed = true;
     return `${p1}overflow-hidden${p2}`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
