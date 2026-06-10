import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Estas variables vendrán del archivo .env que crearemos con las llaves del usuario
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'tu-llave-anonima';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
