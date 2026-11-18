-- Add profile fields used by onboarding and income preferences without
-- dropping or recreating any existing user data.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS income_type TEXT,
  ADD COLUMN IF NOT EXISTS additional_income_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS planning_period_start_day INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
