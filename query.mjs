import https from 'https';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '').replace('\r', '');
});

const options = {
  hostname: env['VITE_SUPABASE_URL'].replace('https://', ''),
  path: '/rest/v1/products?select=name,media_assets&name=ilike.*Semillas%20de%20cal*',
  method: 'GET',
  headers: {
    'apikey': env['VITE_SUPABASE_ANON_KEY'],
    'Authorization': `Bearer ${env['VITE_SUPABASE_ANON_KEY']}`
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
req.on('error', e => console.error(e));
req.end();
