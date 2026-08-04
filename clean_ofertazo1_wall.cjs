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
  console.log('ESCANEO Y ELIMINACIÓN EN VIVO DEL MURO DE OFERTAZO1');
  console.log('===========================================================\n');

  const pageId = '121527094237675'; // Ofertazo1
  const { data: page } = await supabase.from('connected_pages').select('*').eq('page_id', pageId).single();

  if (!page || !page.access_token) {
    console.log('Page token no encontrado');
    return;
  }

  // Fetch feed and tagged posts
  const res = await callGraph(`/${pageId}/feed?fields=id,message,story,from,created_time&limit=20&access_token=${page.access_token}`);
  
  if (res.status === 200 && res.data.data) {
    console.log(`Encontradas ${res.data.data.length} publicaciones en el muro de Ofertazo1:\n`);
    
    for (const item of res.data.data) {
      const msg = item.message || item.story || '';
      const fromName = item.from?.name || 'Usuario';
      console.log(`📄 ID: ${item.id} | De: ${fromName} | Mensaje: "${msg}"`);

      if (msg) {
        const isHater = BAD_WORDS.some(w => msg.toLowerCase().includes(w));
        if (isHater) {
          console.log(`   🚨 DETECTADO POST DE ODIO: "${msg}"`);
          const delRes = await callGraph(`/${item.id}?access_token=${page.access_token}`, 'DELETE');
          console.log(`   🗑️ Resultado Eliminación Meta:`, JSON.stringify(delRes.data));

          await supabase.from('leads').insert({
            store_id: page.store_id || null,
            name: fromName,
            traffic_source: 'Facebook Wall (Menciones)',
            board_type: 'social_media',
            status: 'moderado',
            social_platform: 'facebook',
            comment_content: msg,
            comment_status: 'deleted'
          });
        } else if (item.from?.id !== pageId) {
          console.log(`   💬 Comentario de Venta en Muro: "${msg}"`);
          await supabase.from('leads').insert({
            store_id: page.store_id || null,
            name: fromName,
            traffic_source: 'Facebook Wall (Menciones)',
            board_type: 'social_media',
            status: 'comentario',
            social_platform: 'facebook',
            comment_content: msg,
            comment_status: 'active'
          });

          // Reply publicly
          const replyRes = await callGraph(`/${item.id}/comments?access_token=${page.access_token}`, 'POST', {
            message: `¡Hola ${fromName}! Gracias por escribirnos a Ofertazo1. Sí tenemos disponibilidad del producto y pago contraentrega. ¿En qué ciudad te encuentras?`
          });
          console.log(`   💬 Resultado Respuesta Pública:`, JSON.stringify(replyRes.data));
        }
      }
      console.log('-----------------------------------------------------------');
    }
  } else {
    console.log('Error obteniendo feed:', JSON.stringify(res.data));
  }
}

main();
