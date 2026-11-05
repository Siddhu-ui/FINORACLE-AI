import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isValidHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const isSupabaseConfigured =
  isValidHttpUrl(rawUrl) &&
  rawKey &&
  rawKey !== "YOUR_PUBLISHABLE_KEY" &&
  rawKey !== "YOUR_PROJECT_KEY";

const supabaseUrl = isValidHttpUrl(rawUrl)
  ? rawUrl!
  : "https://placeholder-finoracle.supabase.co";

const supabaseKey =
  rawKey && rawKey !== "YOUR_PUBLISHABLE_KEY"
    ? rawKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

export const supabase = createClient(supabaseUrl, supabaseKey);