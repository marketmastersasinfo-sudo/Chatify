-- 1. Nuevas columnas en store_templates para A/B Testing
ALTER TABLE public.store_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE public.store_templates ADD COLUMN sent_count INTEGER DEFAULT 0;
ALTER TABLE public.store_templates ADD COLUMN conversion_count INTEGER DEFAULT 0;

-- 2. Nueva columna en messages para medir qué plantilla generó la conversión
ALTER TABLE public.messages ADD COLUMN template_id UUID REFERENCES public.store_templates(id) ON DELETE SET NULL;
