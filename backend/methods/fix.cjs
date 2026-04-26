const fs = require('fs');
const path = require('path');

const dir = 'd:\\my projects\\Planovate\\backend\\methods';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find something like { $or: [...] }
  content = content.replace(/\{ \$or: \[.*?\] \}/g, '{ unid: isNaN(Number(id)) ? id : Number(id) }');
  
  fs.writeFileSync(filePath, content);
});
console.log('Fixed methods!');
