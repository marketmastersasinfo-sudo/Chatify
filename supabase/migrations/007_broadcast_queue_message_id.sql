-- Añadir columna message_id para trackear los Open Rates
ALTER TABLE broadcast_queue 
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Crear un índice en message_id para búsquedas rápidas desde el webhook
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_message_id ON broadcast_queue(message_id);
