import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { authService } from '@services/authService';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [error, setError]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd]     = useState(false);
  const { setAuth } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(data);
      setAuth(response.user, response.accessToken, response.refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Sign in to your school account
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          {...register('email')}
          id="email"
          type="email"
          label="Email address"
          placeholder="you@school.com"
          autoComplete="email"
          error={errors.email?.message}
        />

        <Input
          {...register('password')}
          id="password"
          type={showPwd ? 'text' : 'password'}
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
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

        {/* Remember me + Forgot */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" fullWidth loading={isLoading} size="md" className="mt-2">
          Sign in
        </Button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
