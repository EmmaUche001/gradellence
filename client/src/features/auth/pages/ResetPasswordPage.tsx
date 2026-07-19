import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

const ResetPasswordPage: React.FC = () => {
  const [searchParams]                    = useSearchParams();
  const token                             = searchParams.get('token');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirm]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [error, setError]                 = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new link.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error?.message || data.message || 'Failed to reset password.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Invalid token ─────────────────────────────────────────── */
  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center">
              <AlertCircle size={32} className="text-danger-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid reset link</h1>
          <p className="text-sm text-gray-500 mb-8">
            This password reset link is invalid or has expired. Request a new one.
          </p>
          <Link to="/forgot-password">
            <Button variant="primary" fullWidth>Request new link</Button>
          </Link>
          <div className="mt-4">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>

      {success ? (
        /* ── Success ───────────────────────────────────────────── */
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-success-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password reset</h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Your password has been updated successfully. You can now sign in with your new password.
          </p>
          <Link to="/login">
            <Button variant="primary" fullWidth>Go to sign in</Button>
          </Link>
        </div>
      ) : (
        /* ── Form ──────────────────────────────────────────────── */
        <>
          {/* Back link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to sign in
          </Link>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center">
              <KeyRound size={26} className="text-primary-600" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Create new password</h1>
            <p className="mt-2 text-sm text-gray-500">
              Your new password must be at least 8 characters.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl bg-danger-50 border border-danger-100">
              <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              label="New password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              label="Confirm new password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={!token}
              size="md"
            >
              Reset password
            </Button>
          </form>
        </>
      )}

    </AuthLayout>
  );
};

export default ResetPasswordPage;
