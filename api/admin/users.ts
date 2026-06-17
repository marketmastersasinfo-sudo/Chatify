import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chatify-super-secret-key-2025-production');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Authentication middleware
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let userRole;
  try {
    const { payload } = await jwtVerify(authHeader.split(' ')[1], JWT_SECRET);
    userRole = payload.role;
    if (userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('chatify_users')
        .select('id, email, name, role, created_at');

      if (usersError) throw usersError;

      // Get all access
      const { data: access, error: accessError } = await supabase
        .from('user_store_access')
        .select('*');

      if (accessError) throw accessError;

      // Combine
      const usersWithAccess = (users || []).map(u => ({
        ...u,
        storeAccess: (access || []).filter(a => a.user_id === u.id).map(a => ({ storeId: a.store_id }))
      }));

      return res.status(200).json(usersWithAccess);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { email, password, name, role } = req.body;
      const hash = await bcrypt.hash(password, 10);
      
      const { data, error } = await supabase
        .from('chatify_users')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash: hash,
          name,
          role: role || 'COLLABORATOR'
        })
        .select('id, email, name, role, created_at')
        .single();

      if (error) throw error;
      return res.status(200).json({ ...data, storeAccess: [] });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
