import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesPath = path.join(__dirname, 'src', 'pages');

const read = (file) => fs.readFileSync(path.join(pagesPath, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(pagesPath, file), content);

// 1. BulkUpload.jsx
let bulk = read('BulkUpload.jsx');
bulk = bulk.replace(/import { collection, query, where, getDocs } from "firebase\/firestore";\nimport { db } from "\.\.\/firebase\/firebaseConfig";/g, 'import { apiFetch } from "../firebase/services/apiClient";');

bulk = bulk.replace(/const q = query\(collection\(db, "teachers"\), where\("ID", "==", teacherID\)\);\n\s*const snapshot = await getDocs\(q\);\n\s*if \(snapshot\.empty\) {\n\s*return { exists: false };\n\s*}\n\s*const existingTeacher = snapshot\.docs\[0\]\.data\(\);/g, 
  `const res = await apiFetch(\`/teachers?ID=\${encodeURIComponent(teacherID)}\`);
    if (!res || res.length === 0) {
      return { exists: false };
    }
    const existingTeacher = res[0];`);

bulk = bulk.replace(/const checkDuplicateTeacher = async \(teacherID\) => {\n\s*const q = query\(collection\(db, "teachers"\), where\("ID", "==", teacherID\)\);\n\s*const snapshot = await getDocs\(q\);\n\s*return !snapshot\.empty;\n\s*};/g,
  `const checkDuplicateTeacher = async (teacherID) => {
    const res = await apiFetch(\`/teachers?ID=\${encodeURIComponent(teacherID)}\`);
    return res && res.length > 0;
  };`);

bulk = bulk.replace(/const checkDuplicateCourse = async \(courseID\) => {\n\s*const q = query\(collection\(db, "courses"\), where\("ID", "==", courseID\)\);\n\s*const snapshot = await getDocs\(q\);\n\s*return !snapshot\.empty;\n\s*};/g,
  `const checkDuplicateCourse = async (courseID) => {
    const res = await apiFetch(\`/courses?ID=\${encodeURIComponent(courseID)}\`);
    return res && res.length > 0;
  };`);

bulk = bulk.replace(/const checkDuplicateRoom = async \(roomID\) => {\n\s*const q = query\(collection\(db, "rooms"\), where\("ID", "==", roomID\)\);\n\s*const snapshot = await getDocs\(q\);\n\s*return !snapshot\.empty;\n\s*};/g,
  `const checkDuplicateRoom = async (roomID) => {
    const res = await apiFetch(\`/rooms?ID=\${encodeURIComponent(roomID)}\`);
    return res && res.length > 0;
  };`);
write('BulkUpload.jsx', bulk);


// 2. Curriculum.jsx
let curr = read('Curriculum.jsx');
curr = curr.replace(/import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase\/firestore";\nimport { db } from "\.\.\/firebase\/firebaseConfig";/g, 'import { apiFetch } from "../firebase/services/apiClient";');
curr = curr.replace(/await setDoc\(doc\(db, "curriculum", curriculumId\), curriculumData\);/g, 
  `await apiFetch(\`/curriculums/\${curriculumId}\`, { method: 'PUT', body: JSON.stringify(curriculumData) });`);
write('Curriculum.jsx', curr);


// 3. Manage.jsx
let mng = read('Manage.jsx');
mng = mng.replace(/import { doc, updateDoc, collection, query, where, getDocs } from "firebase\/firestore";\nimport { db } from "\.\.\/firebase\/firebaseConfig";/g, 'import { apiFetch } from "../firebase/services/apiClient";');

mng = mng.replace(/const timetableRef = doc\(db, "timetables", timetable\.timetableId\);\n\s*await updateDoc\(timetableRef, {\n\s*class: fields\.updatedClass,\n\s*branch: fields\.updatedBranch,\n\s*totalLectureHours: Number\(fields\.totalLectureHours\) \|\| 0,\n\s*}\);/g,
  `const oldTt = await apiFetch(\`/timetables/\${timetable.timetableId}\`);
      await apiFetch(\`/timetables/\${timetable.timetableId}\`, {
        method: 'PUT',
        body: JSON.stringify({
          ...oldTt,
          class: fields.updatedClass,
          branch: fields.updatedBranch,
          totalLectureHours: Number(fields.totalLectureHours) || 0,
        })
      });`);

mng = mng.replace(/const schedulesQuery = query\([\s\S]*?\n\s*const schedulesSnapshot = await getDocs\(schedulesQuery\);[\s\S]*?if \(scheduleUpdates\.length > 0\) {\n\s*await Promise\.all\(scheduleUpdates\);\n\s*}/g,
  `const schedules = await apiFetch(\`/schedules?timetableId=\${timetable.timetableId}\`);
      await Promise.all(schedules.map(s => 
        apiFetch(\`/schedules/\${s._id}\`, {
          method: 'PUT',
          body: JSON.stringify({
            ...s,
            class: fields.updatedClass,
            branch: fields.updatedBranch
          })
        })
      ));`);

mng = mng.replace(/const curriculumRef = doc\(db, "curriculums", oldCurriculumId\);\n\s*try {\n\s*await updateDoc\(curriculumRef, {\n\s*class: fields\.updatedClass,\n\s*branch: fields\.updatedBranch\n\s*}\);\n\s*} catch \(error\) {\n\s*console\.log\("Curriculum doesn't exist, skipping"\);\n\s*}/g,
  `try {
          const oldCurr = await apiFetch(\`/curriculums/\${oldCurriculumId}\`);
          if (oldCurr) {
            await apiFetch(\`/curriculums/\${oldCurriculumId}\`, {
              method: 'PUT',
              body: JSON.stringify({ ...oldCurr, class: fields.updatedClass, branch: fields.updatedBranch })
            });
          }
        } catch (error) {
          console.log("Curriculum doesn't exist, skipping");
        }`);

write('Manage.jsx', mng);

console.log("Pages updated!");
