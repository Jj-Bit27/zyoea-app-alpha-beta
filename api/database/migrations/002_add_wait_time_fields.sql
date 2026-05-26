-- Agregar campos de tiempo de espera a la tabla orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS estimated_wait_time INT DEFAULT 0,  -- en minutos
ADD COLUMN IF NOT EXISTS actual_wait_time INT,                -- en minutos, NULL si no completado
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;              -- cuándo se completó la orden

-- Crear índices para búsquedas de rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_estimated_wait_time ON orders(estimated_wait_time);
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at DESC);
