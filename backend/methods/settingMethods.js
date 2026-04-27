import Model from '../models/Setting.js';

export const getAll = async (query = {}) => {
  return await Model.find(query);
};

export const getById = async (id) => {
  return await Model.findOne({ _docId: id });
};

export const create = async (data) => {
  const item = new Model(data);
  return await item.save();
};

export const update = async (id, data) => {
  return await Model.findOneAndUpdate({ _docId: id }, { ...data, _docId: id }, { returnDocument: 'after', upsert: true });
};

export const remove = async (id) => {
  return await Model.findOneAndDelete({ _docId: id });
};
