-- Esquema de Base de Datos para Chatify (Supabase)

-- 1. Tabla de Organizaciones (Agrupa todas tus tiendas)
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Tiendas (Conexiones de WhatsApp y Píxeles)
CREATE TABLE public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    waba_number TEXT,
    meta_pixel_id TEXT,
    meta_capi_token TEXT,
    meta_access_token TEXT,
    meta_verify_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Productos (Catálogo y Prompts IA)
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    master_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Leads (Contactos para el Kanban)
CREATE TABLE public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    traffic_source TEXT,
    board_type TEXT NOT NULL CHECK (board_type IN ('sales_wa', 'social_media', 'logistics')),
    status TEXT NOT NULL,
    is_banned BOOLEAN DEFAULT false,
    document_id TEXT,
    email TEXT,
    city TEXT,
    address TEXT,
    product_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Mensajes (Historial de Chats)
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'ai', 'human')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad RLS (Row Level Security) - Permitir lectura y escritura por ahora
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all actions for public" ON public.organizations FOR ALL USING (true);
CREATE POLICY "Enable all actions for public" ON public.stores FOR ALL USING (true);
CREATE POLICY "Enable all actions for public" ON public.products FOR ALL USING (true);
CREATE POLICY "Enable all actions for public" ON public.leads FOR ALL USING (true);
CREATE POLICY "Enable all actions for public" ON public.messages FOR ALL USING (true);

-- Si ya creaste las tablas antes, ejecuta esto en tu SQL Editor para agregar la columna de Baneo y Meta:
-- ALTER TABLE public.leads ADD COLUMN is_banned BOOLEAN DEFAULT false;
-- ALTER TABLE public.stores ADD COLUMN meta_access_token TEXT;
-- ALTER TABLE public.stores ADD COLUMN meta_verify_token TEXT;
