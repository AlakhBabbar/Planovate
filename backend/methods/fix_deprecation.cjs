const fs = require('fs');
const path = require('path');

const dir = 'd:\\my projects\\Planovate\\backend\\methods';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace { new: true } with { returnDocument: 'after' }
  content = content.replace(/\{ new: true, upsert: true \}/g, "{ returnDocument: 'after', upsert: true }");
  content = content.replace(/\{ upsert: true, new: true \}/g, "{ upsert: true, returnDocument: 'after' }");
  
  fs.writeFileSync(filePath, content);
});
console.log('Fixed mongoose deprecation warnings!');
