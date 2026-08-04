-- Crear tabla para la cola de envíos masivos (Anti-Ban)
CREATE TABLE IF NOT EXISTS broadcast_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES store_templates(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para optimizar el CRON
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_status ON broadcast_queue(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_store_id ON broadcast_queue(store_id);

-- RLS
ALTER TABLE broadcast_queue ENABLE ROW LEVEL SECURITY;

-- Como la seguridad por roles se maneja en el frontend o en JWT customizado,
-- permitimos acceso a los usuarios autenticados. El backend asegura
-- el store_id a través de la capa de API.
CREATE POLICY "Permitir acceso a autenticados"
    ON broadcast_queue FOR ALL TO authenticated
    USING (true);
