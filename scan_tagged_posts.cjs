const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

const BAD_WORDS = ['estafa', 'fraude', 'ladrón', 'ladrones', 'puta', 'mierda', 'estafadores', 'robo', 'basura', 'malo', 'mala', 'pésimo', 'pesimo', 'horrible', 'asco', 'rateros', 'ratero', 'falsa', 'fake', 'se quedaron'];

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
  console.log('===========================================================');
  console.log('ESCANEO DE /tagged Y /visitor_posts DE OFERTAZO1');
  console.log('===========================================================\n');

  const pageId = '121527094237675'; // Ofertazo1
  const { data: page } = await supabase.from('connected_pages').select('*').eq('page_id', pageId).single();

  if (!page || !page.access_token) return;

  const taggedRes = await callGraph(`/${pageId}/tagged?fields=id,message,story,from,created_time&limit=20&access_token=${page.access_token}`);
  console.log('Resultado /tagged:', JSON.stringify(taggedRes.data, null, 2));

  if (taggedRes.status === 200 && taggedRes.data.data) {
    for (const item of taggedRes.data.data) {
      const msg = item.message || item.story || '';
      const fromName = item.from?.name || 'Usuario';
      
      const isHater = BAD_WORDS.some(w => msg.toLowerCase().includes(w));
      if (isHater) {
        console.log(`\n🚨 ELIMINANDO POST DE MENCIONES (ID: ${item.id}): "${msg}"...`);
        const delRes = await callGraph(`/${item.id}?access_token=${page.access_token}`, 'DELETE');
        console.log(`🗑️ Resultado Eliminación Meta:`, JSON.stringify(delRes.data));

        await supabase.from('leads').insert({
          store_id: page.store_id || null,
          name: fromName,
          traffic_source: 'Facebook Mentions',
          board_type: 'social_media',
          status: 'moderado',
          social_platform: 'facebook',
          comment_content: msg,
          comment_status: 'deleted'
        });
      } else if (item.from?.id !== pageId) {
        console.log(`\n💬 RESPONDIENDO POST DE VENTA EN MENCIONES (ID: ${item.id}): "${msg}"...`);
        await supabase.from('leads').insert({
          store_id: page.store_id || null,
          name: fromName,
          traffic_source: 'Facebook Mentions',
          board_type: 'social_media',
          status: 'comentario',
          social_platform: 'facebook',
          comment_content: msg,
          comment_status: 'active'
        });

        const replyRes = await callGraph(`/${item.id}/comments?access_token=${page.access_token}`, 'POST', {
          message: `¡Hola ${fromName}! Te saludamos de Ofertazo1. Sí tenemos disponibilidad del producto y pago contraentrega. ¿En qué ciudad te encuentras?`
        });
        console.log(`💬 Resultado Respuesta Pública:`, JSON.stringify(replyRes.data));
      }
    }
  }
}

main();
