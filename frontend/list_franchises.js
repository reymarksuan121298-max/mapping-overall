import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mftbtmccjwkqwqpifhoc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdGJ0bWNjandrcXdxcGlmaG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTQxMTUsImV4cCI6MjA5ODU3MDExNX0.Wx5GZZOOCqfyJO1mHAaRBy9Rjf75fDy19OcO5sQ4Ex8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: franchises, error } = await supabase
    .from('franchises')
    .select('name')
    .order('name');

  if (error) {
    console.error('Error fetching franchises:', error);
    return;
  }

  console.log('--- ALL FRANCHISE LINKS ---');
  franchises.forEach(f => {
    // URL encode the name, and we can replace spaces with hyphens for cleaner links if desired
    // The App.jsx code handles both spaces and hyphens.
    const urlSafeName = encodeURIComponent(f.name.replace(/\s+/g, '-'));
    console.log(`- **${f.name}**: http://localhost:5173/share/map/${urlSafeName}`);
  });
}

main();
