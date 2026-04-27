import mongoose from 'mongoose';

const tempScheduleSchema = new mongoose.Schema({
  timetableId: { type: String, required: true },
  day: { type: String },
  time: { type: String },
  courseId: { type: String },
  teacherId: { type: String },
  roomId: { type: String },
  course: { type: String },
  teacher: { type: String },
  room: { type: String },
  branch: { type: String },
  class: { type: String },
  batch: { type: String },
  rowIndex: { type: Number },
  colIndex: { type: Number },
  batchIndex: { type: Number }
}, { timestamps: true });

export default mongoose.model('TempSchedule', tempScheduleSchema);
