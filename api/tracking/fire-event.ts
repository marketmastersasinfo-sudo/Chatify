import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { firePixelEvent } from '../utils/_tracking.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadId, eventName, value, currency, phone } = req.body;

  if (!leadId || !eventName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const result = await firePixelEvent(supabase, leadId, eventName, value, currency, phone);

  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json({ error: result.error });
  }
}
