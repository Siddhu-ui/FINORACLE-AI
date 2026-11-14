import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp, demoLogin, loading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: 'Siddhant Sharma',
      email: 'siddspr@gmail.com',
    },
  });

  const password = watch('password', '');

  const passwordChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    const { error: authError } = await signUp(data.email, data.password, data.fullName);

    if (authError) {
      setError(authError);
      return;
    }

    navigate('/dashboard');
  };

  const handleInstantDemo = () => {
    demoLogin('Siddhant Sharma', 'siddspr@gmail.com');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] relative flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden">
      <div className="absolute -top-36 -left-28 h-[420px] w-[420px] rounded-full bg-[var(--primary)]/12 blur-[140px]" />
      <div className="absolute -bottom-28 -right-20 h-[420px] w-[420px] rounded-full bg-[var(--primary-light)]/12 blur-[150px]" />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.9) 1px, transparent 0)',
          backgroundSize: '34px 34px',
        }}
      />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary-muted)] border border-[var(--primary)] border-opacity-20 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Your financial roadmap starts here
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.15] text-[var(--text-primary)]">
              Make every money decision
              <span className="block text-[var(--primary)]">with more confidence.</span>
            </h1>

            <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-lg">
              Keep your everyday finances organized with cleaner cash-flow tracking, smarter forecasting, and a calmer financial system.
            </p>
          </div>

          <div className="space-y-3.5 max-w-md">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-[var(--shadow-soft)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--positive-muted)] border border-[var(--primary)] border-opacity-10 flex items-center justify-center text-[var(--positive)]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">Cash flow overview</h4>
                  <p className="text-xs text-[var(--text-muted)]">Actual records, not assumptions</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[var(--positive)] bg-[var(--positive-muted)] px-2 py-1 rounded-md">
                Preview
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-[var(--shadow-soft)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-muted)] border border-[var(--primary)] border-opacity-10 flex items-center justify-center text-[var(--primary)]">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">What-if simulator</h4>
                  <p className="text-xs text-[var(--text-muted)]">Model decisions before you commit</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[var(--primary)] bg-[var(--primary-muted)] px-2 py-1 rounded-md">
                Preview
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-[var(--shadow-soft)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-muted)] border border-[var(--primary)] border-opacity-10 flex items-center justify-center text-[var(--primary)]">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">Goal guidance</h4>
                  <p className="text-xs text-[var(--text-muted)]">Track progress against milestones</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[var(--positive)] flex items-center gap-1 bg-[var(--positive-muted)] px-2 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            </motion.div>
          </div>
        </div>

        <div className="lg:col-span-6 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md relative"
          >
            <div className="absolute -inset-0.5 bg-[var(--primary)]/12 rounded-[28px] blur-xl opacity-80 pointer-events-none" />

            <div className="relative rounded-3xl bg-[var(--card)] backdrop-blur-2xl border border-[var(--card-border)] shadow-[var(--shadow-soft)] p-7 sm:p-9 overflow-hidden">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-[var(--primary)]/10 blur-3xl pointer-events-none rounded-full" />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-[var(--primary)] via-[var(--primary-light)] to-[var(--primary)] rounded-xl flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">FinOracle AI</h2>
                    <p className="text-[10px] text-[var(--primary)] font-medium tracking-wide">FINANCIAL INTELLIGENCE</p>
                  </div>
                </div>

                <Link to="/login" className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors font-semibold">
                  Sign in ?
                </Link>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Create your account</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Start your financial tracking with a clearer baseline.</p>
              </div>

              <button
                type="button"
                onClick={handleInstantDemo}
                className="w-full mb-6 py-3 px-4 rounded-xl bg-[var(--primary-muted)] border border-[var(--primary)] border-opacity-20 text-[var(--primary)] text-xs font-bold flex items-center justify-center gap-2 transition-all hover:bg-[var(--primary)] hover:text-white active:scale-[0.99] group"
              >
                <Zap className="w-4 h-4 text-[var(--primary)] group-hover:scale-110 transition-transform" />
                <span>Quick demo access</span>
              </button>

              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-[var(--card-border)] w-full" />
                <span className="bg-[var(--card)] px-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider relative z-10">
                  Or register with email
                </span>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-3.5 bg-[var(--negative-muted)] border border-[var(--negative)] border-opacity-20 rounded-xl text-xs text-[var(--negative)] flex items-center gap-2"
                >
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input type="text" className="input-field" placeholder="Siddhant Sharma" {...register('fullName')} />
                  {errors.fullName && <p className="text-[11px] text-[var(--negative)] mt-1">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input type="email" className="input-field" placeholder="you@example.com" {...register('email')} />
                  {errors.email && <p className="text-[11px] text-[var(--negative)] mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pr-11"
                      placeholder="��������"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[11px] text-[var(--negative)] mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Re-enter your password"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && <p className="text-[11px] text-[var(--negative)] mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Password requirements
                  </div>
                  {passwordChecks.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                      <span className={item.met ? 'text-[var(--positive)]' : 'text-[var(--text-muted)]'}>
                        {item.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="inline-flex h-3.5 w-3.5 rounded-full border border-current" />
                        )}
                      </span>
                      <span className={item.met ? 'text-[var(--positive)]' : ''}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 text-sm" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}