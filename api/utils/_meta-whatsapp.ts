/**
 * _meta-whatsapp.ts
 * Helper functions to send messages via WhatsApp Cloud API (Meta Direct)
 */

interface MetaMessageOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string; // The customer's phone number without the '+' 
}

/**
 * Sends a plain text message
 */
export async function sendMetaText(options: MetaMessageOptions, text: string) {
  const { phoneNumberId, accessToken, to } = options;
  if (!to) {
    console.log('[Meta WA] No phone number provided, skipping message send.');
    return null;
  }
  
  // Format 'to' number (WhatsApp Cloud API requires numbers without + and without spaces)
  const cleanTo = (to || '').replace(/\D/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      preview_url: false,
      body: text
    }
  };

  return await fetchMetaApi(phoneNumberId, accessToken, payload);
}

/**
 * Sends an image message
 */
export async function sendMetaImage(options: MetaMessageOptions, imageUrl: string, caption?: string) {
  const { phoneNumberId, accessToken, to } = options;
  if (!to) {
    console.log('[Meta WA] No phone number provided, skipping image send.');
    return null;
  }
  
  const cleanTo = (to || '').replace(/\D/g, '');

  // Meta-supported image types: image/jpeg, image/png, image/webp
  // GIFs and other formats need special handling
  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // Strategy: Download image and upload to Meta as media, then send with media_id
  // This works even with signed/private URLs since WE download (server-side)
  try {
    const imgRes = await fetch(imageUrl);
    if (imgRes.ok) {
      let contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      
      // Determine how to send based on content type
      const isGif = contentType.includes('gif');
      const isSupportedImage = SUPPORTED_IMAGE_TYPES.some(t => contentType.includes(t));
      
      // For GIFs: send as document (Meta doesn't support GIF as image)
      // For supported images: upload and send as image
      if (isGif) {
        // Send GIF as document so at least it arrives
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', 'image/gif');
        formData.append('file', new Blob([buffer], { type: 'image/gif' }), 'animation.gif');
        
        // Try as document type since Meta rejects GIF as image
        const docFormData = new FormData();
        docFormData.append('messaging_product', 'whatsapp');
        docFormData.append('type', 'application/octet-stream');
        docFormData.append('file', new Blob([buffer], { type: 'application/octet-stream' }), 'animation.gif');
        
        const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/media`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: docFormData
        });
        const uploadData = await uploadRes.json();
        
        if (uploadData.id) {
          const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanTo,
            type: 'document',
            document: {
              id: uploadData.id,
              filename: 'animation.gif',
              ...(caption && { caption })
            }
          };
          return await fetchMetaApi(phoneNumberId, accessToken, payload);
        }
        // If GIF upload fails, skip it silently (GIFs are optional)
        console.warn('GIF upload to Meta failed, skipping:', uploadData);
        return { skipped: true, reason: 'GIF not supported by Meta' };
      }
      
      // For regular images: fix content type if needed
      if (!isSupportedImage) {
        contentType = 'image/jpeg'; // Default fallback
      }
      
      // Determine correct file extension
      let fileName = 'image.jpg';
      if (contentType.includes('png')) fileName = 'image.png';
      else if (contentType.includes('webp')) fileName = 'image.webp';
      
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', contentType);
      formData.append('file', new Blob([buffer], { type: contentType }), fileName);
      
      const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (uploadData.id) {
        // Send using media_id (most reliable method)
        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'image',
          image: {
            id: uploadData.id,
            ...(caption && { caption })
          }
        };
        return await fetchMetaApi(phoneNumberId, accessToken, payload);
      } else {
        console.error('Meta media upload failed:', uploadData);
      }
    } else {
      console.error('Image download failed:', imgRes.status, imgRes.statusText);
    }
  } catch (uploadErr) {
    console.error('Media upload exception:', uploadErr);
  }

  // Fallback: send with link (works for public URLs only)
  console.warn('Falling back to link method for:', imageUrl.substring(0, 80));
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption && { caption })
    }
  };

  return await fetchMetaApi(phoneNumberId, accessToken, payload);
}

/**
 * Sends a template message
 */
export async function sendMetaTemplate(options: MetaMessageOptions, templateName: string, languageCode: string = 'es', components: any[] = []) {
  const { phoneNumberId, accessToken, to } = options;
  if (!to) {
    console.log('[Meta WA] No phone number provided, skipping template send.');
    return null;
  }
  
  const cleanTo = (to || '').replace(/\D/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: components
    }
  };

  try {
    return await fetchMetaApi(phoneNumberId, accessToken, payload);
  } catch (error: any) {
    // If it's a parameter mismatch error (#132000) and we have body parameters, try reducing them
    if (error.message && error.message.includes('132000')) {
      const bodyComponent = components.find(c => c.type === 'body');
      if (bodyComponent && bodyComponent.parameters && bodyComponent.parameters.length > 0) {
        console.warn(`Template ${templateName} parameter mismatch. Retrying with 1 less parameter...`);
        // Drop the last parameter
        const newComponents = components.map(c => {
          if (c.type === 'body') {
            return { ...c, parameters: c.parameters.slice(0, -1) };
          }
          return c;
        });
        // If parameters array is empty, we completely remove the component
        const finalComponents = newComponents.filter(c => c.type !== 'body' || c.parameters.length > 0);
        return await sendMetaTemplate(options, templateName, languageCode, finalComponents);
      }
    }
    throw error;
  }
}

/**
 * Core fetch wrapper for Meta API
 */
async function fetchMetaApi(phoneNumberId: string, accessToken: string, payload: any) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta WhatsApp API Error:', data);
      throw new Error(`Meta API Error: ${data.error?.message || JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    console.error('fetchMetaApi caught error:', error);
    throw error;
  }
}

/**
 * Get the download URL for a media file from WhatsApp Cloud API
 */
export async function getMediaUrl(mediaId: string, accessToken: string): Promise<{ url: string; mime_type: string }> {
  const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { url: data.url, mime_type: data.mime_type || 'application/octet-stream' };
}

/**
 * Download media binary from WhatsApp Cloud API
 * Returns the raw buffer + mime type
 */
export async function downloadMetaMedia(mediaId: string, accessToken: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Step 1: Get the download URL
  const { url, mime_type } = await getMediaUrl(mediaId, accessToken);
  
  // Step 2: Download the actual file
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);
  
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType: mime_type };
}

