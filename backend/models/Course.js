import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  unid: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String },
  credits: { type: String },
  ID: { type: String },
  department: { type: String },
  faculty: { type: String },
  semester: { type: String },
  lectureHours: { type: Number },
  type: { type: String },
  teachers: [{ type: mongoose.Schema.Types.Mixed }]
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);
