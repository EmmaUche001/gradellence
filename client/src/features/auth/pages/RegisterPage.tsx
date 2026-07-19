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

const registerSchema = z
  .object({
    schoolName:      z.string().min(2, 'School name must be at least 2 characters'),
    schoolAlias:     z.string().min(2, 'School alias must be at least 2 characters'),
    firstName:       z.string().min(2, 'First name must be at least 2 characters'),
    lastName:        z.string().min(2, 'Last name must be at least 2 characters'),
    email:           z.string().email('Invalid email address'),
    phone:           z.string().optional(),
    password:        z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// Password strength helper
function getStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8)          score++;
  if (/[A-Z]/.test(pwd))        score++;
  if (/[0-9]/.test(pwd))        score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: '',        color: 'bg-gray-200' },
    { label: 'Weak',    color: 'bg-danger-500' },
    { label: 'Fair',    color: 'bg-warning-500' },
    { label: 'Good',    color: 'bg-info-500' },
    { label: 'Strong',  color: 'bg-success-500' },
  ];
  return { score, ...map[score] };
}

export function RegisterPage() {
  const [error, setError]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { setAuth } = useAuthStore();

  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const passwordValue = watch('password', '');
  const strength = getStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { confirmPassword, ...payload } = data;
      const response = await authService.register(payload);
      setAuth(response.user, response.accessToken, response.refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout tagline="Join hundreds of schools already managing academic records with Gradellence.">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Set up your school on Gradellence — free for 14 days
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

        {/* School info */}
        <div className="pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">School Information</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              {...register('schoolName')}
              id="schoolName"
              type="text"
              label="School name"
              placeholder="Kings International School"
              error={errors.schoolName?.message}
            />
            <Input
              {...register('schoolAlias')}
              id="schoolAlias"
              type="text"
              label="Short alias"
              placeholder="KIS"
              error={errors.schoolAlias?.message}
            />
          </div>
        </div>

        {/* Admin info */}
        <div className="pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Admin Account</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                {...register('firstName')}
                id="firstName"
                type="text"
                label="First name"
                placeholder="Maxwell"
                error={errors.firstName?.message}
              />
              <Input
                {...register('lastName')}
                id="lastName"
                type="text"
                label="Last name"
                placeholder="Gold"
                error={errors.lastName?.message}
              />
            </div>

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
              {...register('phone')}
              id="phone"
              type="text"
              label="Phone (optional)"
              placeholder="+234-800-000-0000"
            />
          </div>
        </div>

        {/* Password */}
        <div className="pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Password</p>
          <div className="space-y-3">
            <div>
              <Input
                {...register('password')}
                id="password"
                type={showPwd ? 'text' : 'password'}
                label="Password"
                placeholder="••••••••"
                autoComplete="new-password"
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
              {/* Strength indicator */}
              {passwordValue.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                          i <= strength.score ? strength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <p className="text-xs text-gray-500">Strength: <span className="font-medium">{strength.label}</span></p>
                  )}
                </div>
              )}
            </div>

            <Input
              {...register('confirmPassword')}
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              label="Confirm password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
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
          </div>
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-400 leading-relaxed">
          By creating an account you agree to our{' '}
          <a href="#" className="text-primary-600 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>.
        </p>

        <Button type="submit" variant="primary" fullWidth loading={isLoading} size="md">
          Create account
        </Button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
