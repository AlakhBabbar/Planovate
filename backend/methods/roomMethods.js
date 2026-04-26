import Model from '../models/Room.js';

export const getAll = async (query = {}) => {
  return await Model.find(query);
};

export const getById = async (id) => {
  return await Model.findOne({ unid: isNaN(Number(id)) ? id : Number(id) });
};

export const create = async (data) => {
  const item = new Model(data);
  return await item.save();
};

export const update = async (id, data) => {
  return await Model.findOneAndUpdate({ unid: isNaN(Number(id)) ? id : Number(id) }, data, { returnDocument: 'after', upsert: true });
};

export const remove = async (id) => {
  return await Model.findOneAndDelete({ unid: isNaN(Number(id)) ? id : Number(id) });
};
