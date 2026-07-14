const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mftbtmccjwkqwqpifhoc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdGJ0bWNjandrcXdxcGlmaG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTQxMTUsImV4cCI6MjA5ODU3MDExNX0.Wx5GZZOOCqfyJO1mHAaRBy9Rjf75fDy19OcO5sQ4Ex8'
);

async function run() {
  const { data: franchises, error } = await supabase.from('franchises').select('id, name');
  if (error) {
    console.error('Error fetching franchises:', error);
    return;
  }
  
  const usersToInsert = franchises.map(f => {
    const safeName = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      email: safeName + '@kioskmap.com',
      password_hash: '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2',
      full_name: f.name + ' Admin',
      role: 'franchise_admin',
      franchise_id: f.id
    };
  });
  
  console.log('Inserting', usersToInsert.length, 'users...');
  
  for (const user of usersToInsert) {
    const { error: insertError } = await supabase.from('users').insert(user);
    if (insertError) {
      if (insertError.code === '23505') {
        console.log('User already exists for:', user.email);
      } else {
        console.error('Error inserting user:', user.email, insertError);
      }
    } else {
      console.log('Successfully added user:', user.email);
    }
  }
}

run();
