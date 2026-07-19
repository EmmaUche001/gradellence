import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error?.message || data.message || 'Failed to send reset email.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout tagline="Secure, reliable access to your school's academic records.">

      {success ? (
        /* ── Success state ───────────────────────────────────── */
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-success-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            If an account exists for <span className="font-medium text-gray-700">{email}</span>,
            we've sent a password reset link. It may take a minute to arrive.
          </p>
          <Link to="/login">
            <Button variant="primary" fullWidth>
              Back to sign in
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => { setSuccess(false); setEmail(''); }}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Try a different email
          </button>
        </div>
      ) : (
        /* ── Form state ──────────────────────────────────────── */
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
              <Mail size={26} className="text-primary-600" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter your email and we'll send you a reset link.
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
              id="email"
              type="email"
              label="Email address"
              placeholder="you@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              startIcon={<Mail size={16} />}
            />

            <Button type="submit" variant="primary" fullWidth loading={loading} size="md">
              Send reset link
            </Button>
          </form>
        </>
      )}

    </AuthLayout>
  );
};

export default ForgotPasswordPage;
