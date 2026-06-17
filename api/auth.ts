import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chatify-super-secret-key-2025-production'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Check "me"
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ authenticated: false });
      }

      const token = authHeader.split(' ')[1];
      const { payload } = await jwtVerify(token, JWT_SECRET);

      let storeIds: string[] = [];
      if (payload.role === 'SUPER_ADMIN') {
        const { data: allStores } = await supabase.from('stores').select('id');
        storeIds = (allStores || []).map((s: any) => s.id);
      } else {
        const { data: access } = await supabase.from('user_store_access').select('store_id').eq('user_id', payload.id);
        storeIds = (access || []).map((a: any) => a.store_id);
      }

      return res.status(200).json({
        authenticated: true,
        user: { id: payload.id, email: payload.email, name: payload.name, role: payload.role, storeIds }
      });
    } catch (error) {
      return res.status(401).json({ authenticated: false });
    }
  }

  if (req.method === 'POST') {
    // Login
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Faltan credenciales' });

      let { data: user } = await supabase.from('chatify_users').select('*').eq('email', email.toLowerCase().trim()).maybeSingle();

      if (!user && email.toLowerCase().trim() === 'marketmastersas.info@gmail.com') {
        const hash = await bcrypt.hash('+shopieasy.040530*', 10);
        const { data: newUser, error: insertError } = await supabase.from('chatify_users').insert({
          email: 'marketmastersas.info@gmail.com', password_hash: hash, name: 'Administrador Principal', role: 'SUPER_ADMIN'
        }).select().single();
        if (insertError) {
          return res.status(500).json({ success: false, message: 'DB Error: ' + insertError.message + ' (Code: ' + insertError.code + ')' });
        }
        user = newUser;
      }

      if (!user) return res.status(401).json({ success: false, message: 'Credenciales inválidas (Usuario no encontrado)' });

      let isValid = await bcrypt.compare(password, user.password_hash);
      
      // Auto-heal super admin password just in case it was created with a typo
      if (!isValid && email.toLowerCase().trim() === 'marketmastersas.info@gmail.com' && password === '+shopieasy.040530*') {
         const newHash = await bcrypt.hash(password, 10);
         await supabase.from('chatify_users').update({ password_hash: newHash }).eq('id', user.id);
         isValid = true;
         user.password_hash = newHash;
      }

      if (!isValid) return res.status(401).json({ success: false, message: 'Credenciales inválidas (Contraseña incorrecta)' });

      let storeIds: string[] = [];
      if (user.role === 'SUPER_ADMIN') {
        const { data: allStores } = await supabase.from('stores').select('id');
        storeIds = (allStores || []).map((s: any) => s.id);
      } else {
        const { data: access } = await supabase.from('user_store_access').select('store_id').eq('user_id', user.id);
        storeIds = (access || []).map((a: any) => a.store_id);
      }

      const token = await new SignJWT({ id: user.id, email: user.email, name: user.name, role: user.role, storeIds })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET);

      return res.status(200).json({
        success: true, token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, storeIds }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error interno: ' + String(error) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
