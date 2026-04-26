import mongoose from 'mongoose';

const curriculumSchema = new mongoose.Schema({
  curriculumId: { type: String, required: true, unique: true },
  branch: { type: String },
  class: { type: String },
  semester: { type: String },
  type: { type: String },
  courses: [{
    courseId: { type: String },
    teacherIds: [{ type: String }]
  }]
}, { timestamps: true });

export default mongoose.model('Curriculum', curriculumSchema);
