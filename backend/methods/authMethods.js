import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendOtpEmail } from '../services/brevoService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'planovate_jwt_secret_2026';
const ADMIN_CODE = 'GamesSnack26';

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── Register ─────────────────────────────────────────────────────────────────
export async function register(data) {
  const {
    email, password, confirmPassword, name, role,
    adminCode, faculty, department,
    program, branch, semester, rollNo,
  } = data;

  if (!email || !password || !confirmPassword || !name || !role) {
    throw Object.assign(new Error('All required fields must be filled'), { status: 400 });
  }
  if (password !== confirmPassword) {
    throw Object.assign(new Error('Passwords do not match'), { status: 400 });
  }
  if (password.length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 });
  }

  // Role-specific validation
  if (role === 'admin') {
    if (adminCode !== ADMIN_CODE) {
      throw Object.assign(new Error('Invalid admin code'), { status: 403 });
    }
  }
  if (['hod', 'teacher', 'tt_incharge'].includes(role)) {
    if (!faculty?.trim() || !department?.trim()) {
      throw Object.assign(new Error('Faculty and Department are required'), { status: 400 });
    }
  }
  if (role === 'student') {
    if (!program?.trim() || !branch?.trim() || !semester?.trim() || !rollNo?.trim()) {
      throw Object.assign(new Error('Program, Branch, Semester and Roll No are required'), { status: 400 });
    }
  }

  // Check duplicate
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    name: name.trim(),
    role,
    faculty:    faculty?.trim()    || '',
    department: department?.trim() || '',
    program:    program?.trim()    || '',
    branch:     branch?.trim()     || '',
    semester:   semester?.trim()   || '',
    rollNo:     rollNo?.trim()     || '',
  });

  await user.save();

  const token = signToken(user);
  const { password: _, resetOtp: __, resetOtpExpiry: ___, ...safeUser } = user.toObject();
  return { token, user: safeUser };
}

// ── Login ────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  if (!email || !password) {
    throw Object.assign(new Error('Email and password are required'), { status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const token = signToken(user);
  const { password: _, resetOtp: __, resetOtpExpiry: ___, ...safeUser } = user.toObject();
  return { token, user: safeUser };
}

// ── Forgot Password (send OTP) ──────────────────────────────────────────────
export async function forgotPassword(email) {
  if (!email) {
    throw Object.assign(new Error('Email is required'), { status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Don't reveal if email exists — just return silently
    return { message: 'If that email exists, an OTP has been sent.' };
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  user.resetOtp = await bcrypt.hash(otp, 8);
  user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await user.save();

  try {
    await sendOtpEmail(user.email, user.name, otp);
  } catch (emailErr) {
    console.error('Brevo email error:', emailErr?.message || emailErr);
    throw Object.assign(
      new Error('Failed to send OTP email. Please try again later or contact support.'),
      { status: 502 }
    );
  }

  return { message: 'If that email exists, an OTP has been sent.' };
}

// ── Reset Password (verify OTP) ─────────────────────────────────────────────
export async function resetPassword(email, otp, newPassword) {
  if (!email || !otp || !newPassword) {
    throw Object.assign(new Error('Email, OTP and new password are required'), { status: 400 });
  }
  if (newPassword.length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.resetOtp || !user.resetOtpExpiry) {
    throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });
  }
  if (new Date() > user.resetOtpExpiry) {
    throw Object.assign(new Error('OTP has expired'), { status: 400 });
  }

  const otpMatch = await bcrypt.compare(otp, user.resetOtp);
  if (!otpMatch) {
    throw Object.assign(new Error('Invalid OTP'), { status: 400 });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetOtp = null;
  user.resetOtpExpiry = null;
  await user.save();

  return { message: 'Password reset successful' };
}

// ── Admin: list all users ────────────────────────────────────────────────────
export async function listUsers(query = {}) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.faculty) filter.faculty = { $regex: query.faculty, $options: 'i' };
  if (query.department) filter.department = { $regex: query.department, $options: 'i' };
  if (query.search) {
    filter.$or = [
      { name:  { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }

  return await User.find(filter).select('-password -resetOtp -resetOtpExpiry').sort({ createdAt: -1 });
}

// ── Admin: get single user ──────────────────────────────────────────────────
export async function getUserById(id) {
  return await User.findById(id).select('-password -resetOtp -resetOtpExpiry');
}

// ── Admin: update user ──────────────────────────────────────────────────────
export async function updateUser(id, data) {
  // Don't allow password change via this route
  const { password, resetOtp, resetOtpExpiry, ...safeData } = data;
  return await User.findByIdAndUpdate(id, safeData, { new: true }).select('-password -resetOtp -resetOtpExpiry');
}

// ── Admin: delete user ──────────────────────────────────────────────────────
export async function deleteUser(id) {
  return await User.findByIdAndDelete(id);
}

// ── Admin: create user ──────────────────────────────────────────────────────
export async function adminCreateUser(data) {
  const { email, password, name, role, faculty, department, program, branch, semester, rollNo } = data;

  if (!email || !password || !name || !role) {
    throw Object.assign(new Error('Email, password, name and role are required'), { status: 400 });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    name: name.trim(),
    role,
    faculty:    faculty?.trim()    || '',
    department: department?.trim() || '',
    program:    program?.trim()    || '',
    branch:     branch?.trim()     || '',
    semester:   semester?.trim()   || '',
    rollNo:     rollNo?.trim()     || '',
  });

  await user.save();
  const { password: _, resetOtp: __, resetOtpExpiry: ___, ...safeUser } = user.toObject();
  return safeUser;
}
