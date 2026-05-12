import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { forgotPassword, resetPassword } from '../api/auth';

const ForgotPassword = () => {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'done'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep('otp');
    } catch (err) {
      setError(err.message?.replace(/API Error.*?:\s*/, '').replace(/[{}"]/g, '').replace('error:', '').trim() || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      setStep('done');
    } catch (err) {
      setError(err.message?.replace(/API Error.*?:\s*/, '').replace(/[{}"]/g, '').replace('error:', '').trim() || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow';
  const labelCls = 'block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Planovate</h1>
        <p className="text-gray-500 text-sm mt-1">Smart Timetable Management</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 animate-fadeIn">

        {/* ── Step: Done ─────────────────────────────────────── */}
        {step === 'done' ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-sm text-gray-500 mb-6">Your password has been updated successfully.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to Sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {step === 'email' ? 'Forgot Password' : 'Enter OTP'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {step === 'email'
                ? 'Enter your email and we\'ll send a one-time password.'
                : `A 6-digit OTP has been sent to ${email}`}
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="forgot-email" type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" className={inputCls} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className={labelCls}>OTP Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="forgot-otp" type="text" required maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="6-digit code" className={`${inputCls} tracking-[0.5em] text-center font-mono text-lg`} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="forgot-new-password" type="password" required minLength={6} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }} placeholder="Min 6 characters" className={inputCls} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</> : 'Reset Password'}
                </button>

                <button type="button" onClick={() => { setStep('email'); setError(''); }} className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  ← Use a different email
                </button>
              </form>
            )}
          </>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-gray-900 hover:underline">
            ← Back to Sign in
          </Link>
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400">© 2026 Planovate. All rights reserved.</p>
    </div>
  );
};

export default ForgotPassword;
