-- Ejecutar esto en el SQL Editor de Supabase:

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS document_id TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT;
