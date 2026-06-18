-- Agregar soporte para Analytics A/B en el tiempo
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_conversion BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
