import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      const result = data.data;
      setAuth(result.user, result.accessToken, result.refreshToken);
      navigate('/super-admin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center">
            <Shield size={28} className="text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Platform Administration</h1>
          <p className="mt-1.5 text-sm text-gray-500">Restricted access — authorised personnel only</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-card p-8 shadow-sm border border-border">
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 mb-5 rounded-lg bg-danger-50 border border-danger-100">
              <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Admin email"
              placeholder="admin@gradellence.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="mt-2 !bg-gray-900 hover:!bg-gray-800 focus:ring-gray-700"
            >
              Sign in
            </Button>
          </form>
        </div>

        {/* Back link */}
        <p className="mt-5 text-center text-sm text-gray-500">
          Not a platform admin?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
            Go to school login
          </Link>
        </p>

      </div>
    </div>
  );
}
