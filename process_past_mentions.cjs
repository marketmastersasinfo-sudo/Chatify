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
  console.log('PROCESANDO MENSAJES PASADOS ESCRITOS EN EL MURO Y MENCIONES');
  console.log('===========================================================\n');

  const { data: pages } = await supabase.from('connected_pages').select('*');
  const targetIds = ['121527094237675', '112091225194186', '113460161573247', '101316728296723', '240543465799764', '861033647099708', '409267838930893'];

  for (const pageId of targetIds) {
    const page = pages.find(p => p.page_id === pageId);
    if (!page || !page.access_token) continue;

    console.log(`🔍 Inspeccionando historial de: ${page.page_name} (ID: ${pageId})...`);

    // Fetch feed, mentions and tagged
    const endpoints = [`/${pageId}/feed`, `/${pageId}/visitor_posts`, `/${pageId}/tagged`].map(ep => `${ep}?fields=id,message,story,from,created_time,comments{id,message,from}&limit=25&access_token=${page.access_token}`);

    for (const ep of endpoints) {
      const res = await callGraph(ep);
      if (res.status === 200 && res.data.data) {
        for (const item of res.data.data) {
          const msg = item.message || item.story || '';
          const fromId = item.from?.id;
          const fromName = item.from?.name || 'Paula Rojas';

          if (msg && fromId !== pageId) {
            const isHater = BAD_WORDS.some(w => msg.toLowerCase().includes(w));

            if (isHater) {
              console.log(`   🚨 ENCONTRADO COMENTARIO ANTERIOR DE ODIO: "${msg}"`);
              const delRes = await callGraph(`/${item.id}?access_token=${page.access_token}`, 'DELETE');
              console.log(`   🗑️ Resultado Eliminación Meta:`, JSON.stringify(delRes.data));

              // Record in Supabase
              await supabase.from('leads').insert({
                store_id: page.store_id || null,
                name: fromName,
                traffic_source: 'Facebook Wall/Mentions',
                board_type: 'social_media',
                status: 'moderado',
                social_platform: 'facebook',
                comment_content: msg,
                comment_status: 'deleted'
              });
            } else {
              console.log(`   💬 ENCONTRADO COMENTARIO ANTERIOR DE VENTA: "${msg}"`);
              // Insert in leads if not present
              await supabase.from('leads').insert({
                store_id: page.store_id || null,
                name: fromName,
                traffic_source: 'Facebook Wall/Mentions',
                board_type: 'social_media',
                status: 'comentario',
                social_platform: 'facebook',
                comment_content: msg,
                comment_status: 'active'
              });

              // Send public reply if comment/post
              const replyRes = await callGraph(`/${item.id}/comments?access_token=${page.access_token}`, 'POST', {
                message: `¡Hola ${fromName}! Gracias por tu interés en ${page.page_name}. Sí tenemos disponibilidad inmediata y envío con pago contraentrega. ¿En qué ciudad deseas recibirlo?`
              });
              console.log(`   💬 Resultado Respuesta Pública:`, JSON.stringify(replyRes.data));
            }
          }

          // Check inner comments
          if (item.comments && item.comments.data) {
            for (const comm of item.comments.data) {
              const cMsg = comm.message || '';
              const cFromName = comm.from?.name || 'Paula Rojas';
              const cFromId = comm.from?.id;

              if (cMsg && cFromId !== pageId) {
                const isHater = BAD_WORDS.some(w => cMsg.toLowerCase().includes(w));
                if (isHater) {
                  console.log(`   🚨 ENCONTRADO SUB-COMENTARIO ANTERIOR DE ODIO: "${cMsg}"`);
                  const delRes = await callGraph(`/${comm.id}?access_token=${page.access_token}`, 'DELETE');
                  console.log(`   🗑️ Resultado Eliminación:`, JSON.stringify(delRes.data));

                  await supabase.from('leads').insert({
                    store_id: page.store_id || null,
                    name: cFromName,
                    traffic_source: 'Facebook Wall/Mentions',
                    board_type: 'social_media',
                    status: 'moderado',
                    social_platform: 'facebook',
                    comment_content: cMsg,
                    comment_status: 'deleted'
                  });
                } else {
                  console.log(`   💬 ENCONTRADO SUB-COMENTARIO ANTERIOR DE VENTA: "${cMsg}"`);
                  await callGraph(`/${comm.id}/comments?access_token=${page.access_token}`, 'POST', {
                    message: `¡Hola ${cFromName}! Gracias por tu mensaje. Te atendemos con gusto por interno.`
                  });
                }
              }
            }
          }
        }
      }
    }
    console.log('-----------------------------------------------------------');
  }
}

main();
