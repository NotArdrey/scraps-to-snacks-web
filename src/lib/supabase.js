import { createClient } from '@supabase/supabase-js';
import { mockSupabase } from '../visual-docs/mockSupabase';
import { markInitialEmailConfirmationCallback } from './authRedirect';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const useVisualDocsMock = import.meta.env.VITE_VISUAL_DOCS === 'true';

markInitialEmailConfirmationCallback();

export const supabase = useVisualDocsMock
  ? mockSupabase
  : createClient(supabaseUrl, supabaseAnonKey);
