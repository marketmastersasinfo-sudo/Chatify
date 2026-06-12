import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function fixNotes() {
  const { data: leads, error } = await supabase.from('leads').select('*').not('notes', 'is', null);
  if (error) throw error;

  console.log(`Checking ${leads.length} leads...`);

  let fixedCount = 0;

  for (const lead of leads) {
    if (lead.notes && (lead.notes.includes('City:') || lead.notes.includes('Product:'))) {
      const lines = lead.notes.split('\n').map((l: string) => l.trim());
      
      let realOrderId = lead.notes;
      let realCity = lead.city;
      let realAddress = lead.address;
      let realProductName = lead.product_name;

      const orderLine = lines.find((l: string) => l.startsWith('Order ID:'));
      if (orderLine) realOrderId = orderLine;

      const cityLine = lines.find((l: string) => l.startsWith('City:'));
      if (cityLine) realCity = cityLine.replace('City:', '').trim() || realCity;
      
      const addressLine = lines.find((l: string) => l.startsWith('Address:'));
      if (addressLine) realAddress = addressLine.replace('Address:', '').trim() || realAddress;
      
      const productLine = lines.find((l: string) => l.startsWith('Product:'));
      if (productLine) realProductName = productLine.replace('Product:', '').trim() || realProductName;

      const updates: any = {};
      if (realCity && realCity !== lead.city) updates.city = realCity;
      if (realAddress && realAddress !== lead.address) updates.address = realAddress;
      if (realProductName && realProductName !== lead.product_name) updates.product_name = realProductName;
      if (realOrderId !== lead.notes) updates.notes = realOrderId;

      if (Object.keys(updates).length > 0) {
        await supabase.from('leads').update(updates).eq('id', lead.id);
        fixedCount++;
        console.log(`Fixed lead ${lead.name} ->`, updates);
      }
    }
  }

  console.log(`Fixed ${fixedCount} leads.`);
}

fixNotes().catch(console.error);
