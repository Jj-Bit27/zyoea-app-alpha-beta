-- database/migrations/create_payments_table.sql

-- Tabla de pagos con Stripe
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    "user" VARCHAR(255) NOT NULL,
    
    -- IDs de Stripe
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_payment_method_id VARCHAR(255),
    
    -- Información del pago
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER payments_updated_at_trigger
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Constraint para validar estados
ALTER TABLE payments 
ADD CONSTRAINT check_payment_status 
CHECK (status IN (
    'pending',
    'processing', 
    'succeeded', 
    'failed',
    'canceled',
    'refunded',
    'requires_payment_method',
    'requires_confirmation',
    'requires_action'
));
