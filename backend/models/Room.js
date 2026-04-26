import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  unid: { type: mongoose.Schema.Types.Mixed, required: true, unique: true },
  name: { type: String, required: true },
  ID: { type: String },
  capacity: { type: Number },
  floor: { type: String },
  faculty: { type: String },
  availability: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);
