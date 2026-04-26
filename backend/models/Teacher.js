import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
  unid: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  ID: { type: String },
  department: { type: String },
  faculty: { type: String }
}, { timestamps: true });

export default mongoose.model('Teacher', teacherSchema);
