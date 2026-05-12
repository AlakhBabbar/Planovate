import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name:     { type: String, required: true, trim: true },
  role:     { type: String, required: true, enum: ['admin', 'hod', 'teacher', 'tt_incharge', 'student'] },

  // Admin-only
  // (no extra fields needed; admin code verified at signup)

  // HOD / Teacher / TT Incharge
  faculty:    { type: String, default: '' },
  department: { type: String, default: '' },

  // Student
  program:  { type: String, default: '' },  // BTech, BSc, BVoc …
  branch:   { type: String, default: '' },
  semester: { type: String, default: '' },
  rollNo:   { type: String, default: '' },

  // Password-reset OTP
  resetOtp:       { type: String, default: null },
  resetOtpExpiry: { type: Date,   default: null },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
