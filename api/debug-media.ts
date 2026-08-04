import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    );
    
    const results: any = {};
    
    // 1. Find the product
    const { data: product } = await supabase.from('products')
      .select('id, name, media_assets, flow_template_id')
      .ilike('name', '%enterizo%esqueleto%')
      .limit(1).single();
    
    if (!product) {
      // Try broader search
      const { data: products } = await supabase.from('products')
        .select('id, name')
        .ilike('name', '%enterizo%')
        .limit(5);
      return res.status(200).json({ error: 'Product not found', searched: '%enterizo%esqueleto%', available: products });
    }
    
    results.productName = product.name;
    results.flowTemplateId = product.flow_template_id;
    
    // 2. Parse media_assets
    let assets: any[] = [];
    try {
      assets = typeof product.media_assets === 'string' ? JSON.parse(product.media_assets) : product.media_assets || [];
    } catch {}
    
    results.assetCount = assets.length;
    results.assets = assets.map((a: any) => ({
      tag: a.tag,
      type: a.type,
      name: a.name,
      path: a.path || 'NO PATH',
      rule: a.rule || 'NO RULE',
      urlPreview: a.url?.substring(0, 100) + '...'
    }));
    
    // 3. If there's a first asset, test if we can generate a signed URL and download it
    if (assets.length > 0) {
      const firstAsset = assets[0];
      
      // Try to get/generate a signed URL
      let testUrl = firstAsset.url;
      if (firstAsset.path) {
        const { data: signedData, error: signErr } = await supabase.storage
          .from('chatify_media')
          .createSignedUrl(firstAsset.path, 60 * 60);
        results.signedUrlFromPath = signedData?.signedUrl?.substring(0, 100);
        results.signedUrlError = signErr?.message;
        if (signedData?.signedUrl) testUrl = signedData.signedUrl;
      } else {
        // Extract path from URL
        const match = firstAsset.url?.match(/chatify_media\/(.+?)(\?|$)/);
        results.extractedPath = match ? match[1] : 'NO MATCH';
        if (match) {
          const { data: signedData } = await supabase.storage
            .from('chatify_media')
            .createSignedUrl(decodeURIComponent(match[1]), 60 * 60);
          if (signedData?.signedUrl) testUrl = signedData.signedUrl;
          results.regeneratedSignedUrl = signedData?.signedUrl?.substring(0, 100);
        }
      }
      
      // Test downloading the image
      try {
        const imgRes = await fetch(testUrl);
        results.imageDownload = {
          status: imgRes.status,
          contentType: imgRes.headers.get('content-type'),
          contentLength: imgRes.headers.get('content-length')
        };
        
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          results.bufferSize = buffer.length;
          
          // 4. Test uploading to Meta (we need a whatsapp_number for this)
          const { data: waNumber } = await supabase.from('whatsapp_numbers')
            .select('phone_number_id, access_token')
            .limit(1).single();
          
          if (waNumber) {
            results.hasMetaCredentials = true;
            
            try {
              const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
              const formData = new FormData();
              formData.append('messaging_product', 'whatsapp');
              formData.append('type', contentType);
              formData.append('file', new Blob([buffer], { type: contentType }), 'image.jpg');
              
              const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${waNumber.phone_number_id}/media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${waNumber.access_token}` },
                body: formData
              });
              const uploadData = await uploadRes.json();
              results.metaUpload = {
                status: uploadRes.status,
                response: uploadData
              };
            } catch (metaErr: any) {
              results.metaUploadError = metaErr.message;
            }
          } else {
            results.hasMetaCredentials = false;
          }
        }
      } catch (dlErr: any) {
        results.imageDownloadError = dlErr.message;
      }
    }
    
    // 5. Check the flow template
    if (product.flow_template_id) {
      const { data: flowTemplate } = await supabase.from('flow_templates')
        .select('name, steps')
        .eq('id', product.flow_template_id)
        .single();
      
      if (flowTemplate) {
        results.flowTemplateName = flowTemplate.name;
        const steps = typeof flowTemplate.steps === 'string' ? JSON.parse(flowTemplate.steps) : flowTemplate.steps;
        // Check if any step mentions MEDIA or IMG tags
        results.stepsWithMediaTags = steps?.filter((s: any) => 
          /\[(MEDIA|IMG|GIF|AUDIO|VIDEO|FILE)_\d+\]/.test(s.instruction || '')
        ).map((s: any) => ({ title: s.title, instruction: s.instruction?.substring(0, 200) }));
        results.totalSteps = steps?.length;
      }
    }
    
    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
