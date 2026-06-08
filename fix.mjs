import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Protect already wrapped things
  content = content.replace(/\(\(searchTerm \|\| ''\)\.toLowerCase\(\)/g, "searchTerm.toLowerCase(");

  // Property access like obj.prop.toLowerCase()
  content = content.replace(/([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\.toLowerCase\(\)/g, '($1 || \\\'\\\').toLowerCase()');
  
  // Local variables like searchTerm.toLowerCase()
  content = content.replace(/([^a-zA-Z0-9_.'"\\])([a-zA-Z0-9_]+)\.toLowerCase\(\)/g, '$1($2 || \\\'\\\').toLowerCase()');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      fixFile(p);
    }
  }
}

walk('./src');
