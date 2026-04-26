import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirs = ['db', 'models', 'methods', 'routes'];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
});

const dbCode = "import mongoose from 'mongoose';\n\nexport const connectDB = async () => {\n  try {\n    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/planovate');\n    console.log('MongoDB Connected: ' + conn.connection.host);\n  } catch (error) {\n    console.error('MongoDB Error: ' + error.message);\n    process.exit(1);\n  }\n};\n";
fs.writeFileSync(path.join(__dirname, 'db', 'db.js'), dbCode);

const models = {
  'Course.js': "import mongoose from 'mongoose';\n\nconst courseSchema = new mongoose.Schema({\n  unid: { type: Number, required: true, unique: true },\n  name: { type: String, required: true },\n  code: { type: String },\n  credits: { type: String },\n  ID: { type: String },\n  department: { type: String },\n  faculty: { type: String },\n  semester: { type: String },\n  teachers: [{ type: Number }]\n}, { timestamps: true });\n\nexport default mongoose.model('Course', courseSchema);\n",
  'Teacher.js': "import mongoose from 'mongoose';\n\nconst teacherSchema = new mongoose.Schema({\n  unid: { type: Number, required: true, unique: true },\n  name: { type: String, required: true },\n  ID: { type: String },\n  department: { type: String },\n  faculty: { type: String }\n}, { timestamps: true });\n\nexport default mongoose.model('Teacher', teacherSchema);\n",
  'Room.js': "import mongoose from 'mongoose';\n\nconst roomSchema = new mongoose.Schema({\n  unid: { type: mongoose.Schema.Types.Mixed, required: true, unique: true },\n  name: { type: String, required: true },\n  ID: { type: String },\n  capacity: { type: Number },\n  floor: { type: String },\n  faculty: { type: String },\n  availability: {\n    day: {\n      mon: [{ time: String, available: Boolean }],\n      tue: [{ time: String, available: Boolean }],\n      wed: [{ time: String, available: Boolean }],\n      thu: [{ time: String, available: Boolean }],\n      fri: [{ time: String, available: Boolean }],\n      sat: [{ time: String, available: Boolean }]\n    }\n  }\n}, { timestamps: true });\n\nexport default mongoose.model('Room', roomSchema);\n",
  'Curriculum.js': "import mongoose from 'mongoose';\n\nconst curriculumSchema = new mongoose.Schema({\n  curriculumId: { type: String, required: true, unique: true },\n  branch: { type: String },\n  class: { type: String },\n  semester: { type: String },\n  type: { type: String },\n  courses: [{\n    courseId: { type: String },\n    teacherIds: [{ type: String }]\n  }]\n}, { timestamps: true });\n\nexport default mongoose.model('Curriculum', curriculumSchema);\n",
  'Timetable.js': "import mongoose from 'mongoose';\n\nconst timetableSchema = new mongoose.Schema({\n  unid: { type: String, required: true, unique: true },\n  name: { type: String },\n  branch: { type: String },\n  class: { type: String },\n  semester: { type: String },\n  type: { type: String },\n  days: [{ type: String }],\n  timeSlots: [{ type: String }]\n}, { timestamps: true });\n\nexport default mongoose.model('Timetable', timetableSchema);\n",
  'Schedule.js': "import mongoose from 'mongoose';\n\nconst scheduleSchema = new mongoose.Schema({\n  timetableId: { type: String, required: true },\n  day: { type: String },\n  time: { type: String },\n  courseId: { type: String },\n  teacherId: { type: String },\n  roomId: { type: String },\n  branch: { type: String },\n  class: { type: String },\n  batch: { type: String },\n  rowIndex: { type: Number },\n  colIndex: { type: Number },\n  batchIndex: { type: Number }\n}, { timestamps: true });\n\nexport default mongoose.model('Schedule', scheduleSchema);\n",
  'TempSchedule.js': "import mongoose from 'mongoose';\n\nconst tempScheduleSchema = new mongoose.Schema({\n  timetableId: { type: String, required: true },\n  day: { type: String },\n  time: { type: String },\n  courseId: { type: String },\n  teacherId: { type: String },\n  roomId: { type: String },\n  branch: { type: String },\n  class: { type: String },\n  batch: { type: String },\n  rowIndex: { type: Number },\n  colIndex: { type: Number },\n  batchIndex: { type: Number }\n}, { timestamps: true });\n\nexport default mongoose.model('TempSchedule', tempScheduleSchema);\n",
  'Setting.js': "import mongoose from 'mongoose';\n\nconst settingSchema = new mongoose.Schema({\n  _docId: { type: String, required: true, unique: true },\n  list: { type: mongoose.Schema.Types.Mixed }\n}, { timestamps: true });\n\nexport default mongoose.model('Setting', settingSchema);\n"
};

Object.entries(models).forEach(([filename, code]) => {
  fs.writeFileSync(path.join(__dirname, 'models', filename), code);
});

const getMethodCode = (modelName) => "import Model from '../models/" + modelName + ".js';\n\nexport const getAll = async () => {\n  return await Model.find({});\n};\n\nexport const getById = async (id) => {\n  return await Model.findById(id);\n};\n\nexport const create = async (data) => {\n  const item = new Model(data);\n  return await item.save();\n};\n\nexport const update = async (id, data) => {\n  return await Model.findByIdAndUpdate(id, data, { new: true });\n};\n\nexport const remove = async (id) => {\n  return await Model.findByIdAndDelete(id);\n};\n";

Object.keys(models).forEach(filename => {
  const modelName = filename.replace('.js', '');
  fs.writeFileSync(path.join(__dirname, 'methods', modelName.toLowerCase() + 'Methods.js'), getMethodCode(modelName));
});

const getRouteCode = (modelName) => "import express from 'express';\nimport * as methods from '../methods/" + modelName.toLowerCase() + "Methods.js';\n\nconst router = express.Router();\n\nrouter.get('/', async (req, res) => {\n  try {\n    const data = await methods.getAll();\n    res.json(data);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nrouter.post('/', async (req, res) => {\n  try {\n    const data = await methods.create(req.body);\n    res.status(201).json(data);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nrouter.put('/:id', async (req, res) => {\n  try {\n    const data = await methods.update(req.params.id, req.body);\n    res.json(data);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nrouter.delete('/:id', async (req, res) => {\n  try {\n    await methods.remove(req.params.id);\n    res.json({ success: true });\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nexport default router;\n";

Object.keys(models).forEach(filename => {
  const modelName = filename.replace('.js', '');
  fs.writeFileSync(path.join(__dirname, 'routes', modelName.toLowerCase() + 'Routes.js'), getRouteCode(modelName));
});

console.log('Structure created successfully!');
