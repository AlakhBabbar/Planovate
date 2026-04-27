/**
 * Teacher service — MongoDB
 */
import Teacher from '../models/Teacher.js';

export async function getAllTeachers() {
  const docs = await Teacher.find({}).lean();
  return docs.map(d => ({ ...d, unid: d.unid ?? d._id?.toString() }));
}
