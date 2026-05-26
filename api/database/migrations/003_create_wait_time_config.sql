-- Tabla de configuración de tiempos de espera por restaurante
CREATE TABLE IF NOT EXISTS restaurant_wait_config (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id INT NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
    base_time INT NOT NULL DEFAULT 3,              -- minutos mínimos
    avg_prep_time INT NOT NULL DEFAULT 12,         -- promedio histórico
    peak_hour_start INT NOT NULL DEFAULT 12,       -- 12:00 (mediodía)
    peak_hour_end INT NOT NULL DEFAULT 14,         -- 14:00 (2PM)
    peak_factor DECIMAL(3,2) NOT NULL DEFAULT 1.5, -- multiplicador en hora pico
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_restaurant_wait_config_restaurant_id 
ON restaurant_wait_config(restaurant_id);

-- Tabla para registrar métricas de cada orden completada
CREATE TABLE IF NOT EXISTS order_metrics (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_count INT NOT NULL,                    -- número de items en la orden
    prepared_time_minutes INT NOT NULL,         -- tiempo real de preparación
    queue_position INT NOT NULL,                -- posición en la cola cuando se creó
    was_peak_hour BOOLEAN NOT NULL DEFAULT FALSE, -- si fue en hora pico
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id)
);

-- Índices para análisis y reportes
CREATE INDEX IF NOT EXISTS idx_order_metrics_restaurant_id 
ON order_metrics(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_order_metrics_created_at 
ON order_metrics(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_metrics_peak_hour 
ON order_metrics(restaurant_id, was_peak_hour);
