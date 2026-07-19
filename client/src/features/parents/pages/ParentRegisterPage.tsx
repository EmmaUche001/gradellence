import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { parentAuth } from '../services/parentApi';
import { ParentAuthLayout } from '../components/ParentAuthLayout';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

interface FormState {
  firstName: string; lastName: string;
  email: string; password: string; phone: string;
  schoolSlug: string; admissionNumber: string;
}

const ParentRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm]       = useState<FormState>({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', schoolSlug: '', admissionNumber: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await parentAuth.register(form);
      navigate('/parent/login', { state: { message: 'Registration successful. Please sign in.' } });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please check your details.');
    } finally { setLoading(false); }
  };

  return (
    <ParentAuthLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Parent Account</h1>
        <p className="mt-1.5 text-sm text-gray-500">Link your account to your child's school records</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Personal info */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Details</p>
        <div className="grid grid-cols-2 gap-3">
          <Input id="firstName" label="First name" placeholder="Jane"
            value={form.firstName} onChange={set('firstName')} required />
          <Input id="lastName" label="Last name" placeholder="Doe"
            value={form.lastName} onChange={set('lastName')} required />
        </div>
        <Input id="email" type="email" label="Email address" placeholder="you@example.com"
          value={form.email} onChange={set('email')} autoComplete="email" required />
        <Input id="phone" label="Phone (optional)" placeholder="+234-800-000-0000"
          value={form.phone} onChange={set('phone')} />
        <div>
          <Input id="password" type={showPwd ? 'text' : 'password'} label="Password"
            placeholder="Min. 8 characters" value={form.password} onChange={set('password')}
            autoComplete="new-password" required
            endIcon={
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="text-gray-400 hover:text-gray-600 transition-colors pointer-events-auto"
                aria-label={showPwd ? 'Hide' : 'Show'}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            } />
        </div>

        {/* School link */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Link to School</p>
        <Input id="schoolSlug" label="School identifier (slug)" placeholder="kings-international-school"
          value={form.schoolSlug} onChange={set('schoolSlug')} required
          helperText="Ask your school admin for the school slug" />
        <Input id="admissionNumber" label="Child's admission number" placeholder="GDL/2025/001"
          value={form.admissionNumber} onChange={set('admissionNumber')} required
          helperText="Found on the student's report card" />

        <Button type="submit" variant="primary" fullWidth loading={loading}
          className="!bg-success-600 hover:!bg-success-700 focus:ring-success-500 mt-2">
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/parent/login" className="font-semibold text-success-600 hover:text-success-700">
          Sign in
        </Link>
      </p>
    </ParentAuthLayout>
  );
};

export default ParentRegisterPage;
