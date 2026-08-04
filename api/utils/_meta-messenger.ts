import fetch from 'node-fetch';

export interface MessengerOptions {
  pageId: string;
  pageToken: string;
  to: string; // The PSID (Page-Scoped ID) or IG SID of the user
}

/**
 * Helper to call the Facebook Graph API for Messages
 */
async function fetchMessengerApi(pageId: string, pageToken: string, payload: any) {
  const url = `https://graph.facebook.com/v20.0/${pageId}/messages?access_token=${pageToken}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[Meta Messenger] API Error:', data);
    throw new Error(data.error?.message || 'Error desconocido de Meta Messenger');
  }

  return data;
}

/**
 * Envía un mensaje de texto plano por Messenger/Instagram
 */
export async function sendMessengerText(options: MessengerOptions, text: string) {
  const { pageId, pageToken, to } = options;
  if (!to) {
    console.log('[Meta Messenger] No recipient ID provided, skipping text send.');
    return null;
  }

  const payload = {
    recipient: { id: to },
    message: { text }
  };

  return await fetchMessengerApi(pageId, pageToken, payload);
}

/**
 * Envía una imagen por Messenger/Instagram
 */
export async function sendMessengerImage(options: MessengerOptions, imageUrl: string, caption?: string) {
  const { pageId, pageToken, to } = options;
  if (!to) {
    console.log('[Meta Messenger] No recipient ID provided, skipping image send.');
    return null;
  }

  // Meta Graph API allows attaching images via URL
  const payload = {
    recipient: { id: to },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: imageUrl,
          is_reusable: true
        }
      }
    }
  };

  const result = await fetchMessengerApi(pageId, pageToken, payload);

  // If caption exists, send it as a follow-up text message since Messenger attachments don't natively support captions like WhatsApp
  if (caption) {
    await sendMessengerText(options, caption);
  }

  return result;
}

/**
 * Envía un audio por Messenger/Instagram
 */
export async function sendMessengerAudio(options: MessengerOptions, audioUrl: string) {
  const { pageId, pageToken, to } = options;
  if (!to) {
    console.log('[Meta Messenger] No recipient ID provided, skipping audio send.');
    return null;
  }

  const payload = {
    recipient: { id: to },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: audioUrl,
          is_reusable: true
        }
      }
    }
  };

  return await fetchMessengerApi(pageId, pageToken, payload);
}
