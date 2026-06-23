import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { routeAIRequest } from './utils/ai-router.js';

export const maxDuration = 60; // 1 minuto para IA

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Aseguramos que sea POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      source, // 'facebook' | 'instagram'
      page_id, 
      store_id,
      sender_id, 
      sender_name, 
      message, 
      is_dm 
    } = req.body;

    if ((!page_id && !store_id) || !sender_id || !message) {
      return res.status(400).json({ error: 'Missing required fields: page_id/store_id, sender_id, message' });
    }

    // 1. Buscar la tienda a la que pertenece esta página
    let store;
    if (store_id) {
      const { data, error: storeError } = await supabase
        .from('stores')
        .select('id, name, organization_id')
        .eq('id', store_id)
        .maybeSingle();
      if (storeError || !data) {
        return res.status(404).json({ error: 'Store not found for this store_id' });
      }
      store = data;
    } else {
      const searchField = source === 'instagram' ? 'ig_account_id' : 'fb_page_id';
      const { data, error: storeError } = await supabase
        .from('stores')
        .select('id, name, organization_id')
        .eq(searchField, page_id)
        .maybeSingle();
      if (storeError || !data) {
        return res.status(404).json({ error: 'Store not found for this page_id' });
      }
      store = data;
    }

    // 2. Buscar o crear el Lead (Usamos sender_id como phone/id único)
    let { data: lead } = await supabase
      .from('leads')
      .select('id, name, phone, traffic_source, status')
      .eq('phone', sender_id)
      .eq('store_id', store.id)
      .maybeSingle();

    let isNewLead = false;
    if (!lead) {
      const { data: newLead } = await supabase.from('leads').insert({
        store_id: store.id,
        name: sender_name || 'Usuario Redes',
        phone: sender_id, // Usamos el ID social como identificador
        traffic_source: source === 'instagram' ? 'Instagram' : 'Facebook',
        board_type: 'social_media',
        status: 'new'
      }).select().single();
      lead = newLead;
      isNewLead = true;
    }

    // 3. Guardar el mensaje entrante en Chatify
    if (lead) {
      await supabase.from('messages').insert({
        lead_id: lead.id,
        sender_type: 'client',
        content: is_dm ? `[DM] ${message}` : `[Comentario] ${message}`
      });
    }

    // 4. Evaluar con IA (Global Router)
    const systemPrompt = `
      Eres el Community Manager experto en ventas de la tienda "${store.name}".
      Un cliente llamado "${sender_name}" te ha contactado vía ${source}.
      Modo de contacto: ${is_dm ? 'Mensaje Directo (DM)' : 'Comentario Público'}.
      
      Mensaje del cliente: "${message}"

      INSTRUCCIONES ESTRICTAS:
      1. Si el cliente está ofendiendo, insultando o usando palabras como "estafa", "ladrones", "falso", "robo", debes devolver la acción "delete".
      2. Si el cliente pregunta por precios, info o tallas en un COMENTARIO PÚBLICO: debes responder en público brevemente (ej. "¡Hola! Te envié la info por mensaje privado") y redactar el mensaje completo de ventas para el DM privado (private_dm).
      3. Si es un MENSAJE DIRECTO (DM), responde de manera natural, amable y persuasiva para cerrar la venta en private_dm.
      4. Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
      {
        "action": "reply_and_dm" | "delete" | "ignore",
        "public_reply": "texto para responder publicamente o null",
        "private_dm": "texto para enviar por privado o null",
        "intent": "hater" | "pricing" | "sizes" | "other" | "greeting"
      }
    `;

    // Obtener historial de mensajes si ya existía para dar contexto a la IA
    let previousMessages: any[] = [];
    if (!isNewLead && lead) {
      const { data: msgHistory } = await supabase
        .from('messages')
        .select('content, sender_type')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (msgHistory) {
        previousMessages = msgHistory.reverse().map(m => ({
          role: m.sender_type === 'client' ? 'user' : 'assistant',
          content: m.content
        }));
      }
    }

    const aiResponseString = await routeAIRequest({
      organizationId: store.organization_id,
      module: 'social_media',
      systemPrompt,
      messages: previousMessages,
      requireJson: true
    });

    let aiDecision;
    try {
      aiDecision = JSON.parse(aiResponseString);
    } catch (e) {
      console.error('Error parsing AI JSON:', aiResponseString);
      aiDecision = { action: 'ignore', public_reply: null, private_dm: null, intent: 'other' };
    }

    // 5. Guardar las respuestas generadas en la base de datos (para tener registro)
    if (aiDecision.public_reply) {
      await supabase.from('messages').insert({
        lead_id: lead!.id,
        sender_type: 'bot',
        content: `[Respuesta Pública] ${aiDecision.public_reply}`
      });
    }
    if (aiDecision.private_dm) {
      await supabase.from('messages').insert({
        lead_id: lead!.id,
        sender_type: 'bot',
        content: `[DM] ${aiDecision.private_dm}`
      });
    }
    if (aiDecision.action === 'delete') {
      await supabase.from('messages').insert({
        lead_id: lead!.id,
        sender_type: 'bot',
        content: `[SISTEMA] El bot ordenó eliminar el comentario por intención: ${aiDecision.intent}`
      });
    }

    // Actualizar estado del lead dependiendo de la acción
    let newStatus = 'comentario';
    if (aiDecision.action === 'reply_and_dm') newStatus = 'dm_enviado';
    if (aiDecision.action === 'delete') newStatus = 'moderado';
    
    await supabase.from('leads').update({ status: newStatus }).eq('id', lead!.id);

    // 6. Devolver decisión a Make.com para que ejecute la API de Meta
    return res.status(200).json(aiDecision);

  } catch (error: any) {
    console.error('Make Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
