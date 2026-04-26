import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiDir = path.join(__dirname, 'src', 'api');

// rooms.js
const roomsPath = path.join(apiDir, 'rooms.js');
let roomsCode = fs.readFileSync(roomsPath, 'utf8');
roomsCode += `\nexport async function listFaculties() {
  const items = await apiFetch('/rooms');
  const set = new Set();
  items.forEach(i => {
    const faculty = normalize(i.faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}\n`;
fs.writeFileSync(roomsPath, roomsCode);

// teachers.js
const teachersPath = path.join(apiDir, 'teachers.js');
let teachersCode = fs.readFileSync(teachersPath, 'utf8');
teachersCode += `\nexport async function listFaculties() {
  const items = await apiFetch('/teachers');
  const set = new Set();
  items.forEach(i => {
    const faculty = normalize(i.faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function listDepartments({ faculty } = {}) {
  const query = createQueryString({ faculty });
  const items = await apiFetch(\`/teachers\${query}\`);
  const set = new Set();
  items.forEach(i => {
    const department = normalize(i.department);
    if (department) set.add(department);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}\n`;
fs.writeFileSync(teachersPath, teachersCode);

// courses.js
const coursesPath = path.join(apiDir, 'courses.js');
let coursesCode = fs.readFileSync(coursesPath, 'utf8');
coursesCode += `\nexport async function listFaculties() {
  const items = await apiFetch('/courses');
  const set = new Set();
  items.forEach(i => {
    const faculty = normalize(i.faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function listDepartments({ faculty } = {}) {
  const query = createQueryString({ faculty });
  const items = await apiFetch(\`/courses\${query}\`);
  const set = new Set();
  items.forEach(i => {
    const department = normalize(i.department);
    if (department) set.add(department);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}\n`;
fs.writeFileSync(coursesPath, coursesCode);

console.log('Added listFaculties and listDepartments helpers!');
