import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chatify-super-secret-key-2025-production'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ authenticated: false });
    }

    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Refresh store access (it may have changed since JWT was issued)
    let storeIds: string[] = [];
    if (payload.role === 'SUPER_ADMIN') {
      const { data: allStores } = await supabase.from('stores').select('id');
      storeIds = (allStores || []).map((s: any) => s.id);
    } else {
      const { data: access } = await supabase
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', payload.id);
      storeIds = (access || []).map((a: any) => a.store_id);
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        storeIds
      }
    });
  } catch (error) {
    return res.status(401).json({ authenticated: false });
  }
}
