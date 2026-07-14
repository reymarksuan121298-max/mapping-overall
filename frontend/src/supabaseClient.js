import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mftbtmccjwkqwqpifhoc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdGJ0bWNjandrcXdxcGlmaG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTQxMTUsImV4cCI6MjA5ODU3MDExNX0.Wx5GZZOOCqfyJO1mHAaRBy9Rjf75fDy19OcO5sQ4Ex8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
