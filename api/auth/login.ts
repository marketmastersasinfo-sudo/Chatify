import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chatify-super-secret-key-2025-production'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Faltan credenciales' });
    }

    // 1. Find user
    let { data: user } = await supabase
      .from('chatify_users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    // 2. Auto-create SUPER_ADMIN on first login
    if (!user && email.toLowerCase().trim() === 'marketmastersas.info@gmail.com') {
      const hash = await bcrypt.hash('+shopieasy.040530*', 10);
      const { data: newUser } = await supabase
        .from('chatify_users')
        .insert({
          email: 'marketmastersas.info@gmail.com',
          password_hash: hash,
          name: 'Administrador Principal',
          role: 'SUPER_ADMIN'
        })
        .select()
        .single();
      user = newUser;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 3. Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 4. Get store access
    let storeIds: string[] = [];
    if (user.role === 'SUPER_ADMIN') {
      const { data: allStores } = await supabase.from('stores').select('id');
      storeIds = (allStores || []).map((s: any) => s.id);
    } else {
      const { data: access } = await supabase
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', user.id);
      storeIds = (access || []).map((a: any) => a.store_id);
    }

    // 5. Generate JWT
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      storeIds
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeIds
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}
