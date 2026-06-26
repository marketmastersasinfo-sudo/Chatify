import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const maxDuration = 60;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (req.query.cron_key !== process.env.CRON_SECRET_KEY && authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    if (process.env.CRON_SECRET_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { data: pendingComments, error: fetchError } = await supabase
      .from('pending_comments')
      .select('*')
      .eq('status', 'PENDING')
      .lte('process_after', new Date().toISOString())
      .limit(5); // Reducido a 5 para dar tiempo a la IA

    if (fetchError) throw fetchError;
    
    if (!pendingComments || pendingComments.length === 0) {
      return res.status(200).json({ message: 'No hay comentarios pendientes en cola.' });
    }

    console.log(`Procesando ${pendingComments.length} comentarios de la cola...`);
    const results = [];

    for (const comment of pendingComments) {
      try {
        const isInstagram = comment.platform === 'instagram';
        
        // Buscar token: si es Instagram, buscar por instagram_account_id
        let pageData;
        if (isInstagram) {
          const { data } = await supabase
            .from('connected_pages')
            .select('access_token, store_id')
            .eq('instagram_account_id', comment.page_id)
            .single();
          pageData = data;
        } else {
          const { data } = await supabase
            .from('connected_pages')
            .select('access_token, store_id')
            .eq('page_id', comment.page_id)
            .single();
          pageData = data;
        }
          
        const pageToken = pageData?.access_token;

        if (!pageToken) {
          throw new Error(`No access_token encontrado para ${isInstagram ? 'Instagram' : 'Fan Page'}`);
        }

        // 1. OBTENER CONTEXTO DEL POST (Facebook o Instagram)
        let postContext = 'Contexto del post desconocido.';
        let extractedHashtags: string[] = [];
        try {
          let postRes;
          if (isInstagram) {
            // Instagram: obtener caption del media
            postRes = await fetch(`https://graph.facebook.com/v25.0/${comment.post_id}?fields=caption&access_token=${pageToken}`);
          } else {
            // Facebook: obtener message del post
            postRes = await fetch(`https://graph.facebook.com/v19.0/${comment.post_id}?fields=message&access_token=${pageToken}`);
          }
          if (postRes.ok) {
            const postData = await postRes.json();
            const postText = isInstagram ? postData.caption : postData.message;
            if (postText) {
              postContext = postText;
              // Extraer hashtags (ej. #JoggerCol01)
              const matches = postContext.match(/#[a-zA-Z0-9_]+/g);
              if (matches) extractedHashtags = matches;
            }
          }
        } catch (e) {
          console.error('Error obteniendo post:', e);
        }

        // 2. ENCONTRAR EL PRODUCTO POR HASHTAG (Fan Pages Genéricas - Sin store_id)
        let catalogText = 'Sin productos registrados.';
        let matchedProduct: any = null;
        let storeId: string | null = null;

        if (extractedHashtags.length > 0) {
          const { data: hashProducts } = await supabase
            .from('products')
            .select('*')
            .in('ad_hashtag', extractedHashtags)
            .limit(1);
          
          if (hashProducts && hashProducts.length > 0) {
            matchedProduct = hashProducts[0];
            storeId = matchedProduct.store_id;
          }
        }

        // Si encontramos producto por hashtag, armar catálogo CON OFERTAS
        if (matchedProduct) {
          let offersText = '';
          try {
            const offers = JSON.parse(matchedProduct.offers || '[]');
            if (offers.length > 0) {
              offersText = '\nOFERTAS Y COMBOS:\n' + offers.map((o: any) => 
                `- ${o.title}: $${o.price}${o.gift ? ' + Regalo: ' + o.gift : ''}${o.isUpsell ? ' (Upsell)' : ''}`
              ).join('\n');
            }
          } catch(e) {}
          
          const linkText = matchedProduct.product_link ? `\nLINK DE WHATSAPP: ${matchedProduct.product_link}` : '';
          catalogText = `Producto: ${matchedProduct.name}\nPrecio Base: $${matchedProduct.price}${offersText}${linkText}\nDetalles: ${matchedProduct.master_prompt || 'N/A'}`;
        } else {
          // Sin hashtag = respuesta genérica (no crashear)
          console.log(`⚠️ No se encontró hashtag válido en el post ${comment.post_id}. Respondiendo genéricamente.`);
        }

        // 3. LLAMADA A LA IA (SOPHIA) PARA EVITAR ALUCINACIONES
        let publicReply = `¡Hola ${comment.sender_name}! Gracias por tu comentario. Te hemos enviado la información por interno.`;
        let privateReply = '';

        if (process.env.OPENAI_API_KEY) {
          try {
            const prompt = `
Eres un asistente de ventas experto.
Un cliente llamado "${comment.sender_name}" comentó en nuestra publicación de Facebook.
TEXTO DE LA PUBLICACIÓN DE FACEBOOK (Para que sepas de qué trata el anuncio):
"${postContext}"

COMENTARIO DEL CLIENTE:
"${comment.message}"

CATÁLOGO DE PRODUCTOS OFICIAL DE LA TIENDA (No inventes precios ni productos que no estén aquí):
${catalogText}

INSTRUCCIONES:
1. Lee la publicación y el catálogo. Averigua por qué producto está preguntando el cliente.
2. Si pide el precio, DALE EL PRECIO BASE Y TAMBIÉN LAS OFERTAS/COMBOS si existen. No alucines ni inventes datos.
3. Debes generar DOS mensajes:
   - "public_reply": Respuesta CORTA y amable (máximo 3 líneas). Responde su duda brevemente, dile que le enviaste más info por mensaje privado, y AL FINAL incluye el LINK DE WHATSAPP del catálogo si existe.
   - "private_reply": Mensaje más detallado con TODOS los precios, ofertas, combos y el LINK DE WHATSAPP si existe en el catálogo. Este es el mensaje que se envía por DM.

Devuelve EXCLUSIVAMENTE un JSON válido con estas dos llaves: {"public_reply": "...", "private_reply": "..."}.
            `;

            const aiResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" }
            });

            const parsed = JSON.parse(aiResponse.choices[0].message.content || '{}');
            if (parsed.public_reply) publicReply = parsed.public_reply;
            if (parsed.private_reply) privateReply = parsed.private_reply;
          } catch (aiError) {
            console.error('Error en OpenAI:', aiError);
          }
        }

        // 4. RESPUESTA PÚBLICA (Facebook o Instagram)
        let publicRes;
        if (isInstagram) {
          // Instagram: reply al comentario
          publicRes = await fetch(`https://graph.facebook.com/v25.0/${comment.comment_id}/replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: publicReply, access_token: pageToken })
          });
        } else {
          // Facebook: comment al comentario
          publicRes = await fetch(`https://graph.facebook.com/v19.0/${comment.comment_id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: publicReply, access_token: pageToken })
          });
        }
        const publicData = await publicRes.json();
        if (!publicRes.ok) throw new Error(publicData.error?.message || `Error en ${isInstagram ? 'IG' : 'FB'} API Público`);

        // 5. RESPUESTA PRIVADA (DM) EN FACEBOOK
        let dmSent = false;
        if (privateReply) {
          const fbPrivateRes = await fetch(`https://graph.facebook.com/v19.0/${comment.page_id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { comment_id: comment.comment_id },
              message: { text: privateReply },
              access_token: pageToken
            })
          });
          if (fbPrivateRes.ok) dmSent = true;
          else console.error('Error enviando DM:', await fbPrivateRes.json());
        }

        // 6. ACTUALIZAR CRM: Vincular tienda y marcar que se envió DM
        const { data: leadData } = await supabase
          .from('leads')
          .select('id')
          .eq('name', comment.sender_name)
          .eq('board_type', 'social_media')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (leadData) {
          const leadUpdate: any = {
            status: dmSent ? 'dm_enviado' : 'comentario'
          };
          // Vincular la tienda correcta si encontramos producto por hashtag
          if (storeId) leadUpdate.store_id = storeId;
          
          await supabase.from('leads').update(leadUpdate).eq('id', leadData.id);
          
          if (dmSent) {
            await supabase.from('messages').insert({ lead_id: leadData.id, sender_type: 'ai', content: `[DM FB Enviado] ${privateReply}` });
          }
        }

        // 7. MARCAR COMO PROCESADO
        await supabase.from('pending_comments').update({ status: 'PROCESSED', processed_at: new Date().toISOString() }).eq('comment_id', comment.comment_id);
        results.push({ comment_id: comment.comment_id, status: 'success', dm_sent: dmSent });

      } catch (err: any) {
        console.error(`Error procesando comentario ${comment.comment_id}:`, err);
        await supabase.from('pending_comments').update({ status: 'FAILED' }).eq('comment_id', comment.comment_id);
        results.push({ comment_id: comment.comment_id, status: 'error', reason: err.message });
      }
    }

    return res.status(200).json({ message: 'Lote procesado', results });

  } catch (err: any) {
    console.error('Error maestro en cron:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
