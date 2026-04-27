import Model from '../models/TempSchedule.js';

export const getAll = async (query = {}) => {
  return await Model.find(query);
};

export const getById = async (id) => {
  return await Model.findById(id);
};

export const create = async (data) => {
  const item = new Model(data);
  return await item.save();
};

export const update = async (id, data) => {
  return await Model.findByIdAndUpdate(id, data, { returnDocument: 'after', upsert: false });
};

export const remove = async (id) => {
  return await Model.findByIdAndDelete(id);
};
