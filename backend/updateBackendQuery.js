import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const models = ['Course', 'Teacher', 'Room', 'Curriculum', 'Timetable', 'Schedule', 'TempSchedule', 'Setting'];

const getMethodCode = (modelName) => "import Model from '../models/" + modelName + ".js';\n\nexport const getAll = async (query = {}) => {\n  return await Model.find(query);\n};\n\nexport const getById = async (id) => {\n  return await Model.findOne({ $or: [{ _docId: id }, { unid: id }, { curriculumId: id }, { _id: id }] });\n};\n\nexport const create = async (data) => {\n  const item = new Model(data);\n  return await item.save();\n};\n\nexport const update = async (id, data) => {\n  return await Model.findOneAndUpdate({ $or: [{ _docId: id }, { unid: id }, { curriculumId: id }, { timetableId: id }] }, data, { new: true, upsert: true });\n};\n\nexport const remove = async (id) => {\n  return await Model.findOneAndDelete({ $or: [{ _docId: id }, { unid: id }, { curriculumId: id }, { timetableId: id }] });\n};\n";

models.forEach(modelName => {
  fs.writeFileSync(path.join(__dirname, 'methods', modelName.toLowerCase() + 'Methods.js'), getMethodCode(modelName));
});

const getRouteCode = (modelName) => "import express from 'express';\nimport * as methods from '../methods/" + modelName.toLowerCase() + "Methods.js';\n\nconst router = express.Router();\n\nrouter.get('/', async (req, res) => {\n  try {\n    const data = await methods.getAll(req.query);\n    res.json(data);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nrouter.post('/', async (req, res) => {\n  try {\n    const data = await methods.create(req.body);\n    res.status(201).json(data);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nrouter.put('/:id', async (req, res) => {\n  try {\n    const data = await methods.update(req.params.id, req.body);\n    res.json(data);\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nrouter.delete('/:id', async (req, res) => {\n  try {\n    await methods.remove(req.params.id);\n    res.json({ success: true });\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n});\n\nexport default router;\n";

models.forEach(modelName => {
  fs.writeFileSync(path.join(__dirname, 'routes', modelName.toLowerCase() + 'Routes.js'), getRouteCode(modelName));
});

console.log('Backend routes and methods updated to support query params and frontend ID fields!');
