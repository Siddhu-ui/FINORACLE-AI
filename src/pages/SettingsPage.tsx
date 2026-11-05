import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Settings,
  User,
  Shield,
  CreditCard,
  Bell,
  Save,
  CheckCircle2,
  Loader2,
  DollarSign,
  Briefcase,
  Mail,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/supabase';
import { Card, PageHeader } from '@/components/ui';
import type { UserProfile } from '@/types';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email(),
  phone: z.string().optional(),
  occupation: z.string().optional(),
  monthly_income: z.number().min(0, 'Income cannot be negative').default(0),
  currency: z.string().default('INR'),
});

type FormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    setLoading(true);
    try {
      const profile = await profileService.get();
      if (profile) {
        reset({
          full_name: profile.full_name || user?.user_metadata?.full_name || '',
          email: profile.email || user?.email || '',
          phone: profile.phone || '',
          occupation: profile.occupation || '',
          monthly_income: profile.monthly_income || 0,
          currency: profile.currency || 'INR',
        });
      } else {
        reset({
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
          phone: '',
          occupation: '',
          monthly_income: 0,
          currency: 'INR',
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await profileService.upsert(data as Partial<UserProfile>);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Account & System Settings"
        subtitle="Manage your personal profile, baseline financial numbers, and platform preferences"
      />

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Card */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    {...register('full_name')}
                    className="input-field w-full pl-9 text-xs"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                {errors.full_name && <p className="text-xs text-negative mt-1">{errors.full_name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    {...register('email')}
                    disabled
                    className="input-field w-full pl-9 text-xs opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    {...register('phone')}
                    className="input-field w-full pl-9 text-xs"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                  Occupation / Industry
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    {...register('occupation')}
                    className="input-field w-full pl-9 text-xs"
                    placeholder="e.g. Software Engineer / Consultant"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Financial Profile Card */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-secondary" /> Financial Baseline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                  Default Monthly Net Income (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">₹</span>
                  <input
                    type="number"
                    {...register('monthly_income', { valueAsNumber: true })}
                    className="input-field w-full pl-7 text-xs font-medium"
                    placeholder="85000"
                  />
                </div>
                {errors.monthly_income && <p className="text-xs text-negative mt-1">{errors.monthly_income.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">
                  Primary Currency
                </label>
                <select {...register('currency')} className="input-field w-full text-xs">
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Security & Authentication */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-positive" /> Security & Session
            </h3>
            <p className="text-xs text-text-secondary mb-2">
              Authenticated via Supabase Auth. Passwords and sensitive session tokens are securely encrypted.
            </p>
            <div className="bg-background-secondary p-3 rounded-xl flex items-center justify-between text-xs">
              <span className="text-text-muted">User ID: <code className="text-text-primary">{user?.id || 'Local User'}</code></span>
              <span className="text-positive font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active Session
              </span>
            </div>
          </Card>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs text-positive font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Preferences
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
