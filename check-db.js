const fs = require('fs');

async function check() {
    const url = 'https://mftbtmccjwkqwqpifhoc.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdGJ0bWNjandrcXdxcGlmaG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTQxMTUsImV4cCI6MjA5ODU3MDExNX0.Wx5GZZOOCqfyJO1mHAaRBy9Rjf75fDy19OcO5sQ4Ex8';
    try {
        const res = await fetch(url);
        const data = await res.json();
        const defs = data.definitions;
        
        const testColumn = async (col) => {
            const res = await fetch(`${url.split('/?')[0]}/employees?select=${col}&limit=1`, {
                headers: {
                    'apikey': url.split('apikey=')[1],
                    'Authorization': `Bearer ${url.split('apikey=')[1]}`
                }
            });
            if (res.ok) {
                console.log(`Column ${col} exists in employees table!`);
            } else {
                console.log(`Column ${col} does NOT exist in employees table.`);
            }
        };
        
        await testColumn('area');
        await testColumn('municipality');
        await testColumn('area_id');
        await testColumn('municipality_id');
        await testColumn('franchise');
        await testColumn('franchise_id');
        await testColumn('spvr');
        await testColumn('supervisor_id');
    } catch (e) {
        console.error(e);
    }
}
check();
