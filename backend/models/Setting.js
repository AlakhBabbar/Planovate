import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  _docId: { type: String, required: true, unique: true },
  list: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
