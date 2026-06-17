import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chatify-super-secret-key-2025-production');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { payload } = await jwtVerify(authHeader.split(' ')[1], JWT_SECRET);
    if (payload.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Expected path: /api/admin/users-access
    // Body: { userId, storeId, hasAccess }
    const { userId, storeId, hasAccess } = req.body;

    if (!userId || !storeId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    if (hasAccess) {
      // Add access
      const { error } = await supabase
        .from('user_store_access')
        .insert({ user_id: userId, store_id: storeId });
      
      // Ignore conflict errors (already has access)
      if (error && error.code !== '23505') throw error;
    } else {
      // Remove access
      const { error } = await supabase
        .from('user_store_access')
        .delete()
        .match({ user_id: userId, store_id: storeId });
        
      if (error) throw error;
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Access error', e);
    return res.status(500).json({ error: 'Failed to modify access' });
  }
}
