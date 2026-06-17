import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file manually
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const email = 'marketmastersas.info@gmail.com';
  console.log('Testing select...');
  let { data, error } = await supabase.from('chatify_users').select('*').eq('email', email).maybeSingle();
  console.log('Select Result:', data, 'Error:', error);

  if (!data) {
    console.log('User not found. Testing insert...');
    const { data: insData, error: insError } = await supabase.from('chatify_users').insert({
      email: email,
      password_hash: 'dummyhash',
      name: 'Admin',
      role: 'SUPER_ADMIN'
    }).select().single();
    console.log('Insert Result:', insData, 'Error:', insError);
  }
}

check();
