import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Zap,
  Target,
  FlaskConical,
  CheckCircle2,
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
    } else {
      navigate('/onboarding');
    }
  };

  const handleInstantDemo = () => {
    demoLogin('Siddhant Sharma', 'siddspr@gmail.com');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#07070D] text-text-primary relative flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden">
      {/* Ambient Glossy Background Glows */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '36px 36px',
        }}
      />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Side: Brand Showcase & Interactive Widgets (Hidden on small screens) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-light">
                Next-Gen Financial Intelligence
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.15]">
              Understand Your Money.{' '}
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-primary-light bg-clip-text text-transparent">
                Simulate Your Future.
              </span>
            </h1>

            <p className="text-base text-text-secondary leading-relaxed max-w-lg">
              Deterministic scenario simulation, exact amortization modeling, and RAG-grounded AI assistance designed to engineer your financial freedom.
            </p>
          </div>

          {/* Floating Glassy Feature Widgets */}
          <div className="space-y-3.5 max-w-md">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-positive/10 border border-positive/20 flex items-center justify-center text-positive">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">Monthly Retained Surplus</h4>
                  <p className="text-xs text-text-muted">Post-expense free cashflow</p>
                </div>
              </div>
              <span className="text-sm font-bold text-positive font-mono">+₹73,800/mo</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">What-If Shock Simulator</h4>
                  <p className="text-xs text-text-muted">Career elevation & 12M trajectory</p>
                </div>
              </div>
              <span className="text-xs font-bold text-primary-light bg-primary/20 px-2 py-0.5 rounded-md">
                +₹3.75L Net Gain
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">Goal Guardian</h4>
                  <p className="text-xs text-text-muted">Emergency fortress pace</p>
                </div>
              </div>
              <span className="text-xs font-bold text-positive flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 82% On Track
              </span>
            </motion.div>
          </div>
        </div>

        {/* Right Side: Ultra-Glossy Registration Card */}
        <div className="lg:col-span-6 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md relative"
          >
            {/* Card Gloss Outer Glow & Highlights */}
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 via-indigo-500/20 to-transparent rounded-[28px] blur-xl opacity-75 pointer-events-none" />

            <div className="relative rounded-3xl bg-[#12121E]/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.15)] p-7 sm:p-9 overflow-hidden">
              {/* Gloss Sheen Streak */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-primary/25 blur-3xl pointer-events-none rounded-full" />

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-primary via-indigo-500 to-primary-light rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary leading-tight">FinOracle AI</h2>
                    <p className="text-[10px] text-primary-light font-medium tracking-wide">FINANCIAL INTELLIGENCE</p>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="text-xs text-text-secondary hover:text-primary transition-colors font-semibold"
                >
                  Sign In →
                </Link>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-text-primary tracking-tight">Create your account</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Start simulating your financial future in seconds.
                </p>
              </div>

              {/* Instant 1-Click Demo Access Button */}
              <button
                type="button"
                onClick={handleInstantDemo}
                className="w-full mb-6 py-3 px-4 rounded-xl bg-gradient-to-r from-primary/15 via-indigo-500/10 to-primary/15 border border-primary/30 hover:border-primary/60 text-primary-light hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.99] group"
              >
                <Zap className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span>⚡ Quick Demo Mode (1-Click Explore)</span>
              </button>

              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#12121E] px-3 text-[11px] font-medium text-text-muted uppercase tracking-wider relative z-10">
                  Or register with email
                </span>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-3.5 bg-negative/15 border border-negative/30 rounded-xl text-xs text-negative flex items-center gap-2"
                >
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 focus:bg-white/[0.07] transition-all"
                    placeholder="Siddhant Sharma"
                    {...register('fullName')}
                  />
                  {errors.fullName && (
                    <p className="text-[11px] text-negative mt-1">{errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 focus:bg-white/[0.07] transition-all"
                    placeholder="siddspr@gmail.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-negative mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pr-11 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 focus:bg-white/[0.07] transition-all"
                      placeholder="Create a strong password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-negative mt-1">{errors.password.message}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {passwordChecks.map((check) => (
                      <div key={check.label} className="flex items-center gap-1.5 text-[10px]">
                        <div className={`w-1.5 h-1.5 rounded-full ${check.met ? 'bg-positive' : 'bg-text-dim'}`} />
                        <span className={check.met ? 'text-positive font-medium' : 'text-text-muted'}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 focus:bg-white/[0.07] transition-all"
                    placeholder="Confirm your password"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-negative mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-3 px-5 rounded-xl bg-gradient-to-r from-primary via-indigo-500 to-primary-light hover:brightness-110 shadow-lg shadow-primary/25 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-[11px] text-text-muted text-center mt-5">
                By creating an account, you agree to our terms of service and financial simulation privacy policy.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
