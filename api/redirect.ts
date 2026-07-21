import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const storeQuery = (req.query.store || req.query.s || req.query.slug || '').toString().trim();
    const fbclid = req.query.fbclid?.toString();
    const gclid = req.query.gclid?.toString();
    const ttclid = req.query.ttclid?.toString();
    const productName = req.query.product?.toString() || req.query.p?.toString();
    const customText = req.query.text?.toString();

    if (!storeQuery) {
      return res.status(400).send('Store parameter required. Example: /r/comprasya');
    }

    // 1. Buscar la tienda por nombre o ID
    let storeData: any = null;
    const { data: storeByName } = await supabase
      .from('stores')
      .select('*')
      .ilike('name', `%${storeQuery}%`)
      .limit(1);

    if (storeByName && storeByName.length > 0) {
      storeData = storeByName[0];
    } else {
      // Buscar por ID
      const { data: storeById } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeQuery)
        .maybeSingle();
      storeData = storeById;
    }

    if (!storeData) {
      return res.status(404).send(`Tienda '${storeQuery}' no encontrada.`);
    }

    // 2. Buscar número ACTIVO en el Pool (whatsapp_numbers)
    const { data: waNumbers } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('store_id', storeData.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    let targetPhone = '';
    if (waNumbers && waNumbers.length > 0) {
      // Seleccionar un número activo
      const randomWa = waNumbers[Math.floor(Math.random() * waNumbers.length)];
      // Usar display_phone_number solo si es un número telefónico real (longitud estándar < 15) y no un ID de Meta (longitud >= 15)
      const disp = (randomWa.display_phone_number || '').replace(/\D/g, '');
      if (disp && disp.length < 15) {
        targetPhone = disp;
      }
    }

    // Fallback al teléfono de la tienda en stores.phone o whatsapp_numbers.phone
    if (!targetPhone) {
      targetPhone = storeData.phone || storeData.meta_phone_number || '573000000000';
    }

    // Limpiar el número de teléfono (solo dígitos)
    const cleanPhone = targetPhone.replace(/\D/g, '');

    // 3. Armar mensaje de inicio
    let defaultMsg = `Hola, vengo de la tienda ${storeData.name}`;
    if (productName) {
      defaultMsg += ` interesado en ${productName}`;
    }
    if (customText) {
      defaultMsg = customText;
    }

    // Adjuntar tokens de tracking al texto si existen (para lectura transparente en webhook)
    const trackingTokens = [];
    if (fbclid) trackingTokens.push(`[fbclid:${fbclid}]`);
    if (gclid) trackingTokens.push(`[gclid:${gclid}]`);
    if (ttclid) trackingTokens.push(`[ttclid:${ttclid}]`);

    if (trackingTokens.length > 0) {
      defaultMsg += ` ${trackingTokens.join(' ')}`;
    }

    const encodedText = encodeURIComponent(defaultMsg);
    const destinationUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    // 4. Redirección HTTP 302 hacia WhatsApp
    return res.redirect(302, destinationUrl);

  } catch (err: any) {
    console.error('Smart Redirect Router Error:', err);
    return res.status(500).send('Redirect Error: ' + err.message);
  }
}
