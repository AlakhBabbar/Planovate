import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');
const firebaseDir = path.join(srcDir, 'firebase');
const apiDir = path.join(srcDir, 'api');
const servicesDir = path.join(firebaseDir, 'services');

// 1. Move services out to src/api
if (fs.existsSync(servicesDir)) {
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir);
  }
  const files = fs.readdirSync(servicesDir);
  files.forEach(file => {
    fs.renameSync(path.join(servicesDir, file), path.join(apiDir, file));
  });
  console.log('Moved files to src/api');
}

// 2. Remove the old firebase folder
if (fs.existsSync(firebaseDir)) {
  fs.rmSync(firebaseDir, { recursive: true, force: true });
  console.log('Deleted old firebase folder');
}

// 3. Update all imports in src recursively
function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      content = content.replace(/['"]([^'"]*)firebase\/services([^'"]*)['"]/g, function(match, p1, p2) {
        return '"' + p1 + 'api' + p2 + '"';
      });
      
      content = content.replace(/import\s+{\s*db\s*}\s+from\s+['"][^'"]*firebaseConfig['"];?\n?/g, '');
      content = content.replace(/import\s+{\s*db\s*}\s+from\s+['"][^'"]*firebase\/firebaseConfig['"];?\n?/g, '');
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log("Updated imports in " + fullPath);
      }
    }
  });
}

processDirectory(srcDir);
console.log('Migration complete!');
