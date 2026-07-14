
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mftbtmccjwkqwqpifhoc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
// Wait, I need the actual anon key. I can extract it from supabaseClient.js or .env

