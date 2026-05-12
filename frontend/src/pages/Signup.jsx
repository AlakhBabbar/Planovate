import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Loader2, AlertCircle, ShieldCheck, Building, BookOpen, Hash } from 'lucide-react';
import { registerUser } from '../api/auth';
import useAuthStore from '../store/authStore';

const ROLES = [
  { value: 'admin',       label: 'Admin' },
  { value: 'hod',         label: 'HOD' },
  { value: 'teacher',     label: 'Teacher' },
  { value: 'tt_incharge', label: 'TT Incharge' },
  { value: 'student',     label: 'Student' },
];

const Signup = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', name: '', role: '',
    adminCode: '', faculty: '', department: '',
    program: '', branch: '', semester: '', rollNo: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await registerUser(form);
      setAuth(token, user);
      navigate('/');
    } catch (err) {
      const msg = err.message || 'Registration failed';
      // Extract clean error from API response
      const clean = msg.replace(/API Error \(\d+\):\s*/, '').replace(/[{}"]/g, '').replace('error:', '').trim();
      setError(clean);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow';
  const labelCls = 'block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Planovate</h1>
        <p className="text-gray-500 text-sm mt-1">Smart Timetable Management</p>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-200 p-8 animate-fadeIn">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Create an account</h2>
        <p className="text-sm text-gray-500 mb-6">Fill in your details to get started</p>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="signup-name" name="name" type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your full name" className={inputCls} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="signup-email" name="email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" className={inputCls} />
            </div>
          </div>

          {/* Password row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input id="signup-password" name="password" type={showPw ? 'text' : 'password'} required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 6 chars" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input id="signup-confirm" name="confirmPassword" type={showPw ? 'text' : 'password'} required minLength={6} value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="Re-enter" className={inputCls} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className={labelCls}>Role</label>
            <div className="grid grid-cols-5 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('role', r.value)}
                  className={`px-2 py-2 text-xs font-medium rounded-lg border transition-all ${
                    form.role === r.value
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Role-specific fields ─────────────────────────────── */}

          {/* Admin: unique code */}
          {form.role === 'admin' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 animate-fadeIn">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Admin Verification</p>
              <div>
                <label className={labelCls}>Admin Code</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input id="signup-admin-code" name="adminCode" type="text" required value={form.adminCode} onChange={(e) => set('adminCode', e.target.value)} placeholder="Enter admin code" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* HOD / Teacher / TT Incharge: faculty + department */}
          {['hod', 'teacher', 'tt_incharge'].includes(form.role) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 animate-fadeIn">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Department Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Faculty</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="signup-faculty" name="faculty" type="text" required value={form.faculty} onChange={(e) => set('faculty', e.target.value)} placeholder="e.g. Engineering" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="signup-department" name="department" type="text" required value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. CSE" className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student: program, branch, semester, rollNo */}
          {form.role === 'student' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3 animate-fadeIn">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Student Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Program / Course</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="signup-program" name="program" type="text" required value={form.program} onChange={(e) => set('program', e.target.value)} placeholder="e.g. BTech" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Branch</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="signup-branch" name="branch" type="text" required value={form.branch} onChange={(e) => set('branch', e.target.value)} placeholder="e.g. CSE" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Semester</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="signup-semester" name="semester" type="text" required value={form.semester} onChange={(e) => set('semester', e.target.value)} placeholder="e.g. 4" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Roll No</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="signup-rollno" name="rollNo" type="text" required value={form.rollNo} onChange={(e) => set('rollNo', e.target.value)} placeholder="e.g. 21CSE001" className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            id="signup-submit"
            type="submit"
            disabled={loading || !form.role}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-gray-900 hover:underline">
            Sign in
          </Link>
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400">© 2026 Planovate. All rights reserved.</p>
    </div>
  );
};

export default Signup;
