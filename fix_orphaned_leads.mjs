import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim() && !key.startsWith('#')) {
    env[key.trim()] = val.join('=').trim();
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function fixOrphanedLeads() {
  console.log("Fixing orphaned leads...");
  
  // Fetch all leads
  const { data: leads, error } = await supabase.from('leads').select('*');
  if (error) {
    console.error("Error fetching leads:", error);
    return;
  }
  
  let fixedCount = 0;

  for (const lead of leads) {
    let newStatus = lead.status;
    
    if (lead.board_type === 'logistics') {
      const validStatuses = ['nuevo', 'confirmado', 'en_ruta', 'entregado', 'novedad', 'devolucion', 'falsa'];
      if (!validStatuses.includes(lead.status)) {
        newStatus = 'nuevo';
      }
    } else if (lead.board_type === 'remarketing_carts') {
      const validStatuses = ['abandoned', 'contacting', 'negotiating', 'recovered', 'lost'];
      if (!validStatuses.includes(lead.status)) {
        newStatus = 'abandoned';
      }
    } else if (lead.board_type === 'remarketing_wa') {
      const validStatuses = ['cold_lead', 'qualifying', 'hot_lead', 'negotiating', 'recovered', 'lost'];
      if (!validStatuses.includes(lead.status)) {
        newStatus = 'cold_lead';
      }
    } else if (lead.board_type === 'sales_wa' || lead.board_type === 'sales_social' || lead.board_type === 'customer_service') {
      const validStatuses = ['new', 'contacted', 'interaction', 'closed', 'lost', 'human'];
      if (!validStatuses.includes(lead.status)) {
        newStatus = 'new';
      }
    }

    if (newStatus !== lead.status) {
      console.log(`Fixing lead ${lead.name}: ${lead.board_type} -> status from ${lead.status} to ${newStatus}`);
      await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
      fixedCount++;
    }
  }

  console.log(`Successfully fixed ${fixedCount} orphaned leads!`);
}

fixOrphanedLeads();
