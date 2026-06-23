import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Cargar keys si existe un .env con supabase, o de alguna otra forma
// En este caso, busquemos el VITE_SUPABASE_URL que Vite inyecta o miremos src/lib/supabase.ts
// Ya que no tenemos el .env completo, vamos a usar un truquito:
// Leeremos del archivo que Vercel haya buildeado, o buscaremos las keys en el entorno local.
const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
console.log('URL:', VITE_SUPABASE_URL);
