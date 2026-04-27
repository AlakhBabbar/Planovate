/**
 * Course service — reads the "courses" MongoDB collection.
 */
import Course from '../models/Course.js';

export async function getAllCourses() {
  const docs = await Course.find({}).lean();
  return docs.map(d => ({ ...d, unid: d.unid ?? d._id?.toString() }));
}
