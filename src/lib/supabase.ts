import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://yholetgmaexmcvupmwmn.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_Q7f-82AxY673B2CvzJxt5g_Xcki060E";

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export type { User, Session } from "@supabase/supabase-js";
