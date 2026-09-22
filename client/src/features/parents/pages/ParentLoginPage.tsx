import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parentAuth } from '../services/parentApi';
import { ParentAuthLayout } from '../components/ParentAuthLayout';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

const ParentLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const successMsg = (location.state as any)?.message as string | undefined;

  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setShake(false); setLoading(true);
    try {
      const result = await parentAuth.login({ email, password });
      localStorage.setItem('parent_token', result.accessToken);
      navigate('/parent/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid email or password.';
      setError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally { setLoading(false); }
  };

  return (
    <ParentAuthLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
        <p className="mt-1.5 text-sm text-gray-500">Sign in to monitor your child's performance</p>
      </div>

      {successMsg && (
        <div className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl bg-success-50 border border-success-100">
          <CheckCircle2 size={16} className="text-success-600 shrink-0 mt-0.5" />
          <p className="text-sm text-success-700">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${shake ? 'animate-shake' : ''}`} noValidate>
        <Input id="email" type="email" label="Email address" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />

        <Input id="password" type={showPwd ? 'text' : 'password'} label="Password"
          placeholder="••••••••" value={password} onChange={e => setPass(e.target.value)}
          autoComplete="current-password" required
          endIcon={
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
              aria-label={showPwd ? 'Hide password' : 'Show password'}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          } />

        <Button type="submit" variant="primary" fullWidth loading={loading}
          className="!bg-success-600 hover:!bg-success-700 focus:!ring-success-500 !rounded-xl !h-12 !text-base">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/parent/register" className="font-semibold text-success-600 hover:text-success-700">
          Register here
        </Link>
      </p>
    </ParentAuthLayout>
  );
};

export default ParentLoginPage;
