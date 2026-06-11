import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: stores, error: getErr } = await supabase.from('stores').select('*').limit(1);
  if (getErr) {
    console.error('Error fetching stores:', getErr);
    return;
  }

  const phoneId = '1214960561689813';
  const accessToken = 'EAAYJ71Jl0G8BRmgOScuSV3IwEiPYbIk8xbOCPuMR2ZBj2OIdiaCDkmvn4gDJO8l64nTXDsmZAZC7jiYmWdgsL9H0EIuQyQGE27qnOHCG7PHdHYKrDwsriB086tow9DgFy6LjiLwIskN05T14gAcMSxTWaKSm6t6aKPZAK7mnAbYMVCz9lQWqqP7c8lhEIsvRD2YjvkPnWNHzjkwS80Sm88smTcc8mRLyBB0L2w6ZC5DmwgaUsIxZBqa2t3f6RNfftCZCrIQZBYxZACWg2hWYy9uMjZAMR1t7QseDFnk1wZD';
  const verifyToken = 'chatify_meta_secret_2026';

  if (stores && stores.length > 0) {
    console.log('Updating existing store...');
    const { error: upErr } = await supabase.from('stores').update({
      meta_access_token: accessToken,
      meta_verify_token: verifyToken,
      waba_number: phoneId
    }).eq('id', stores[0].id);
    
    if (upErr) console.error('Update Error:', upErr);
    else console.log('Successfully updated store!');
  } else {
    console.log('No store found. Creating one...');
    let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    let orgId;
    if (!orgs || orgs.length === 0) {
       const { data: newOrg } = await supabase.from('organizations').insert({ name: 'Mi Empresa' }).select().single();
       orgId = newOrg.id;
    } else {
       orgId = orgs[0].id;
    }

    const { error: inErr } = await supabase.from('stores').insert({
      organization_id: orgId,
      name: 'Tienda Principal',
      country: 'CO',
      waba_number: phoneId,
      meta_access_token: accessToken,
      meta_verify_token: verifyToken
    });

    if (inErr) console.error('Insert Error:', inErr);
    else console.log('Successfully inserted store!');
  }
}

run();
