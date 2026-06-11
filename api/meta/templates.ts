import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { storeId } = req.query;

  if (!storeId) {
    return res.status(400).json({ error: 'Falta el storeId en la petición' });
  }

  try {
    // 1. Obtener credenciales de la tienda
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('waba_id, meta_access_token')
      .eq('id', storeId as string)
      .single();

    if (storeError || !store || !store.waba_id || !store.meta_access_token) {
      return res.status(400).json({ 
        error: 'La tienda no tiene configurado un WABA ID o un Token de Acceso válido.' 
      });
    }

    const { waba_id, meta_access_token } = store;
    const META_API_VERSION = 'v20.0';
    const baseUrl = `https://graph.facebook.com/${META_API_VERSION}/${waba_id}/message_templates`;

    // ==========================================
    // GET: Obtener todas las plantillas de Meta
    // ==========================================
    if (req.method === 'GET') {
      const response = await fetch(`${baseUrl}?limit=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${meta_access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Error de Meta API', details: data });
      }

      return res.status(200).json({ success: true, data: data.data });
    }

    // ==========================================
    // POST: Crear una nueva plantilla en Meta
    // ==========================================
    if (req.method === 'POST') {
      const payload = req.body;
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${meta_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Error creando plantilla', details: data });
      }

      return res.status(200).json({ success: true, data: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Meta Templates API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
