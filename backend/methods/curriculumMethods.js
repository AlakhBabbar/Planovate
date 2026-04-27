import Model from '../models/Curriculum.js';

export const getAll = async (query = {}) => {
  return await Model.find(query);
};

export const getById = async (id) => {
  // Curriculum primary key is curriculumId (string), not unid
  return await Model.findOne({ curriculumId: id });
};

export const create = async (data) => {
  const item = new Model(data);
  return await item.save();
};

export const update = async (id, data) => {
  // Upsert by curriculumId — create if not exists, update if exists
  return await Model.findOneAndUpdate(
    { curriculumId: id },
    { $set: data },
    { returnDocument: 'after', upsert: true, new: true }
  );
};

export const remove = async (id) => {
  return await Model.findOneAndDelete({ curriculumId: id });
};
