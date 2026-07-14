const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://mftbtmccjwkqwqpifhoc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdGJ0bWNjandrcXdxcGlmaG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTQxMTUsImV4cCI6MjA5ODU3MDExNX0.Wx5GZZOOCqfyJO1mHAaRBy9Rjf75fDy19OcO5sQ4Ex8');
supabase.from('users').select('*').eq('email', '5aroyal@kioskmap.com').then(res => {
  const dbHash = res.data[0].password_hash;
  console.log('Hash in DB:', dbHash);
  console.log('Length:', dbHash.length);
  const expected = '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2';
  console.log('Expected:', expected, 'Length:', expected.length);
  console.log('Equal?', dbHash === expected);
});
