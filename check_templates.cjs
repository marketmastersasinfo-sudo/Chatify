const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

function callGraph(path, method = 'GET', bodyData = null) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v20.0${path}`;
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (bodyData) req.write(JSON.stringify(bodyData));
    req.end();
  });
}

async function main() {
  console.log('Consultando plantillas (Templates) en los 13 WABAs de WhatsApp...\n');
  
  const { data: numbers } = await supabase.from('whatsapp_numbers').select('*');
  
  let report = [];

  for (const num of numbers) {
    if (!num.waba_id || !num.whatsapp_token) {
      report.push(`📱 ${num.display_name} (${num.phone_number}): ❌ Falta WABA ID o Token en base de datos.`);
      continue;
    }

    const res = await callGraph(`/${num.waba_id}/message_templates?access_token=${num.whatsapp_token}`);
    
    if (res.status === 200 && res.data && res.data.data) {
      const templates = res.data.data;
      const approved = templates.filter(t => t.status === 'APPROVED');
      
      if (approved.length > 0) {
        report.push(`📱 ${num.display_name} (${num.phone_number}): ✅ TIENE ${approved.length} plantillas aprobadas (Ej: ${approved[0].name}).`);
      } else {
        report.push(`📱 ${num.display_name} (${num.phone_number}): ⚠️ NO TIENE plantillas aprobadas aún.`);
      }
    } else {
      report.push(`📱 ${num.display_name} (${num.phone_number}): ❌ Error al leer Meta API - ${res.data?.error?.message || 'Token vencido'}`);
    }
  }

  console.log(report.join('\n'));
}

main();
