import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema({
  unid: { type: String, required: true, unique: true },
  name: { type: String },
  branch: { type: String },
  class: { type: String },
  semester: { type: String },
  type: { type: String },
  days: [{ type: String }],
  timeSlots: [{ type: String }],
  tables: [{ type: String }],
  batchesByTable: { type: mongoose.Schema.Types.Mixed },
  batchDataByTable: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('Timetable', timetableSchema);
