import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

async function run() {
  // First get the org id
  let res = await fetch(`${supabaseUrl}/rest/v1/organizations?select=id`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const orgs = await res.json();
  
  if (orgs.length > 0) {
    const orgId = orgs[0].id;
    // Update the org
    res = await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${orgId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ google_maps_api_key: 'AIzaSyD3amxq4t9GA892zO4C70nbnPGqnG4Ct-A' })
    });
    
    if (res.ok) {
        console.log("SUCCESSFULLY UPDATED ORG:", await res.json());
    } else {
        console.error("FAILED TO UPDATE ORG:", await res.text());
    }
  } else {
    console.log("No orgs found");
  }
}

run();
