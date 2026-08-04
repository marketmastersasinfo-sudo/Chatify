import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Tests the complete media send flow: 
 * 1. Load product assets
 * 2. Generate signed URL
 * 3. Download image
 * 4. Upload to Meta Media API
 * 5. Send message with media_id to a test number
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    );
    
    const testTo = req.query.to as string || '573182533893'; // Default test number
    const productSearch = req.query.product as string || '%enterizo%esqueleto%';
    const assetIndex = parseInt(req.query.asset as string || '0');
    
    const results: any = { steps: [] };
    
    // Step 1: Find product
    const { data: product } = await supabase.from('products')
      .select('id, name, media_assets, store_id')
      .ilike('name', productSearch)
      .limit(1).single();
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    results.product = product.name;
    results.steps.push({ step: 1, status: 'ok', msg: `Found product: ${product.name}` });
    
    // Step 2: Parse assets
    const assets = typeof product.media_assets === 'string' 
      ? JSON.parse(product.media_assets) 
      : product.media_assets || [];
    
    if (assets.length === 0 || assetIndex >= assets.length) {
      return res.status(400).json({ error: `No asset at index ${assetIndex}`, assetCount: assets.length });
    }
    
    const asset = assets[assetIndex];
    results.asset = { tag: asset.tag, type: asset.type, name: asset.name, path: asset.path };
    results.steps.push({ step: 2, status: 'ok', msg: `Using asset: ${asset.tag} (${asset.type}: ${asset.name})` });
    
    // Step 3: Generate signed URL
    let imageUrl = asset.url;
    if (asset.path) {
      const { data: signedData, error: signErr } = await supabase.storage
        .from('chatify_media')
        .createSignedUrl(asset.path, 60 * 60);
      if (signedData?.signedUrl) {
        imageUrl = signedData.signedUrl;
        results.steps.push({ step: 3, status: 'ok', msg: 'Generated fresh signed URL' });
      } else {
        results.steps.push({ step: 3, status: 'error', msg: `Signed URL failed: ${signErr?.message}` });
      }
    } else {
      results.steps.push({ step: 3, status: 'skip', msg: 'No path, using stored URL' });
    }
    
    // Step 4: Download image
    let buffer: Buffer;
    let contentType: string;
    try {
      const imgRes = await fetch(imageUrl);
      results.steps.push({ 
        step: '4a', status: imgRes.ok ? 'ok' : 'error', 
        msg: `Download: ${imgRes.status} ${imgRes.statusText}`,
        contentType: imgRes.headers.get('content-type'),
        contentLength: imgRes.headers.get('content-length')
      });
      
      if (!imgRes.ok) {
        return res.status(500).json(results);
      }
      
      contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      buffer = Buffer.from(await imgRes.arrayBuffer());
      results.steps.push({ step: '4b', status: 'ok', msg: `Buffer size: ${buffer.length} bytes` });
    } catch (dlErr: any) {
      results.steps.push({ step: 4, status: 'error', msg: `Download exception: ${dlErr.message}` });
      return res.status(500).json(results);
    }
    
    // Step 5: Get Meta credentials
    const { data: waNumber } = await supabase.from('whatsapp_numbers')
      .select('phone_number_id, access_token')
      .eq('store_id', product.store_id)
      .limit(1).single();
    
    if (!waNumber) {
      // Fallback: any number
      const { data: anyNumber } = await supabase.from('whatsapp_numbers')
        .select('phone_number_id, access_token')
        .limit(1).single();
      if (!anyNumber) {
        results.steps.push({ step: 5, status: 'error', msg: 'No WhatsApp credentials found' });
        return res.status(500).json(results);
      }
      Object.assign(waNumber || {}, anyNumber);
    }
    results.steps.push({ step: 5, status: 'ok', msg: `Meta credentials: phone_id=${(waNumber as any).phone_number_id}` });
    
    // Step 6: Upload to Meta Media API
    let fileName = 'image.jpg';
    if (contentType.includes('png')) fileName = 'image.png';
    else if (contentType.includes('webp')) fileName = 'image.webp';
    
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', contentType);
    formData.append('file', new Blob([buffer], { type: contentType }), fileName);
    
    let mediaId: string | null = null;
    try {
      const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${(waNumber as any).phone_number_id}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${(waNumber as any).access_token}` },
        body: formData
      });
      const uploadData = await uploadRes.json();
      results.steps.push({ 
        step: 6, status: uploadRes.ok ? 'ok' : 'error', 
        msg: `Upload response: ${JSON.stringify(uploadData)}`,
        httpStatus: uploadRes.status
      });
      mediaId = uploadData.id || null;
    } catch (upErr: any) {
      results.steps.push({ step: 6, status: 'error', msg: `Upload exception: ${upErr.message}` });
      return res.status(500).json(results);
    }
    
    if (!mediaId) {
      results.steps.push({ step: 6.5, status: 'error', msg: 'No media_id returned from upload' });
      return res.status(500).json(results);
    }
    
    // Step 7: Send message with media_id
    const sendDryRun = req.query.send !== 'true';
    if (sendDryRun) {
      results.steps.push({ step: 7, status: 'dry_run', msg: `Would send to ${testTo} with media_id=${mediaId}. Add &send=true to actually send.` });
      return res.status(200).json(results);
    }
    
    const cleanTo = testTo.replace(/\D/g, '');
    const sendPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'image',
      image: {
        id: mediaId,
        caption: `Test image: ${asset.name}`
      }
    };
    
    try {
      const sendRes = await fetch(`https://graph.facebook.com/v19.0/${(waNumber as any).phone_number_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(waNumber as any).access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendPayload)
      });
      const sendData = await sendRes.json();
      results.steps.push({ 
        step: 7, status: sendRes.ok ? 'ok' : 'error', 
        msg: `Send response: ${JSON.stringify(sendData)}`,
        httpStatus: sendRes.status
      });
    } catch (sendErr: any) {
      results.steps.push({ step: 7, status: 'error', msg: `Send exception: ${sendErr.message}` });
    }
    
    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
