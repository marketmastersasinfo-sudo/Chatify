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
  
  // Format 'to' number (WhatsApp Cloud API requires numbers without + and without spaces)
  const cleanTo = to.replace(/\D/g, '');

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
  const cleanTo = to.replace(/\D/g, '');

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
export async function sendMetaTemplate(
  options: MetaMessageOptions, 
  templateName: string, 
  languageCode: string = 'es',
  components: any[] = []
) {
  const { phoneNumberId, accessToken, to } = options;
  const cleanTo = to.replace(/\D/g, '');

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

  return await fetchMetaApi(phoneNumberId, accessToken, payload);
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

