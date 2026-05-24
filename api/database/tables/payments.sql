-- Tabla de Pagos (Payments)

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    "user" INT NOT NULL REFERENCES users(id),
    order_id INT REFERENCES orders(id) ON DELETE SET NULL,

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
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments("user");
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

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

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_own ON payments
    FOR SELECT
    USING (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
    );

CREATE POLICY payments_insert_authenticated ON payments
    FOR INSERT
    WITH CHECK (
        "user" = current_user_id()
        AND current_user_id() IS NOT NULL
    );

CREATE POLICY payments_update_admin ON payments
    FOR UPDATE
    USING (current_user_role() = 'admin')
    WITH CHECK (current_user_role() = 'admin');

CREATE POLICY payments_delete_admin ON payments
    FOR DELETE
    USING (current_user_role() = 'admin');

CREATE TRIGGER payments_updated_at_trigger
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
