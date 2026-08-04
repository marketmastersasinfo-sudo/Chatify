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
  console.log('ESCANEO Y MODERACIÓN EN VIVO DE PUBLICACIONES DE MURO Y FEED');
  console.log('===========================================================\n');

  const { data: pages } = await supabase.from('connected_pages').select('*');
  if (!pages) return;

  const targetIds = ['121527094237675', '112091225194186', '113460161573247', '101316728296723'];

  for (const pageId of targetIds) {
    const page = pages.find(p => p.page_id === pageId);
    if (!page || !page.access_token) continue;

    console.log(`📄 Escaneando Muro / Feed de: ${page.page_name} (ID: ${pageId})...`);

    // Fetch recent feed and visitor posts (tagged/feed)
    const feedRes = await callGraph(`/${pageId}/feed?fields=id,message,from,created_time,comments{id,message,from}&limit=10&access_token=${page.access_token}`);
    
    if (feedRes.status === 200 && feedRes.data.data) {
      for (const item of feedRes.data.data) {
        const fromId = item.from?.id;
        const fromName = item.from?.name || 'Usuario';
        const msg = item.message || '';

        // Check if item message is hater
        if (msg && fromId !== pageId) {
          const isHater = BAD_WORDS.some(w => msg.toLowerCase().includes(w));
          if (isHater) {
            console.log(`   🚨 DETECTADO COMENTARIO/POST DE ODIO EN ${page.page_name}: "${msg}"`);
            const delRes = await callGraph(`/${item.id}?access_token=${page.access_token}`, 'DELETE');
            console.log(`   🗑️ Resultado Eliminación de Meta:`, JSON.stringify(delRes.data));

            // Record in CRM as moderado/deleted
            await supabase.from('leads').insert({
              store_id: page.store_id || null,
              name: fromName,
              traffic_source: 'Facebook Wall/Ads',
              board_type: 'social_media',
              status: 'moderado',
              social_platform: 'facebook',
              comment_content: msg,
              comment_status: 'deleted'
            });
          } else {
            console.log(`   💬 Detectado Comentario de Venta en ${page.page_name}: "${msg}"`);
            // Insert lead and reply
            await supabase.from('leads').insert({
              store_id: page.store_id || null,
              name: fromName,
              traffic_source: 'Facebook Wall/Ads',
              board_type: 'social_media',
              status: 'comentario',
              social_platform: 'facebook',
              comment_content: msg,
              comment_status: 'active'
            });

            // Send public reply
            const replyRes = await callGraph(`/${item.id}/comments?access_token=${page.access_token}`, 'POST', {
              message: `¡Hola ${fromName}! Gracias por tu interés. Te saludamos de ${page.page_name}. ¿En qué ciudad te encuentras para brindarte la información del envío?`
            });
            console.log(`   💬 Resultado Respuesta Pública:`, JSON.stringify(replyRes.data));
          }
        }

        // Check inner comments
        if (item.comments && item.comments.data) {
          for (const comm of item.comments.data) {
            const cFromId = comm.from?.id;
            const cFromName = comm.from?.name || 'Usuario';
            const cMsg = comm.message || '';

            if (cMsg && cFromId !== pageId) {
              const isHater = BAD_WORDS.some(w => cMsg.toLowerCase().includes(w));
              if (isHater) {
                console.log(`   🚨 DETECTADO SUB-COMENTARIO DE ODIO: "${cMsg}"`);
                const delRes = await callGraph(`/${comm.id}?access_token=${page.access_token}`, 'DELETE');
                console.log(`   🗑️ Resultado Eliminación de Meta:`, JSON.stringify(delRes.data));

                await supabase.from('leads').insert({
                  store_id: page.store_id || null,
                  name: cFromName,
                  traffic_source: 'Facebook Ads',
                  board_type: 'social_media',
                  status: 'moderado',
                  social_platform: 'facebook',
                  comment_content: cMsg,
                  comment_status: 'deleted'
                });
              } else {
                console.log(`   💬 Sub-comentario de venta: "${cMsg}"`);
                await callGraph(`/${comm.id}/comments?access_token=${page.access_token}`, 'POST', {
                  message: `¡Hola ${cFromName}! Gracias por tu mensaje. Te atendemos con gusto por interno.`
                });
              }
            }
          }
        }
      }
    } else {
      console.log(`   Error obteniendo feed:`, JSON.stringify(feedRes.data));
    }
    console.log('-----------------------------------------------------------');
  }
}

main();
