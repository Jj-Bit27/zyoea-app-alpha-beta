-- Tabla de Pedidos (Orders)

CREATE TABLE orders (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user" INT REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100) NULL,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    "table" INT REFERENCES tables(id) ON DELETE SET NULL,
    "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ABIERTA',
    notes TEXT,
    total DECIMAL(10,2),
    "type" VARCHAR(50) NOT NULL DEFAULT 'dine_in',
    paid BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

ALTER TABLE orders
ADD CONSTRAINT check_orders_status CHECK ("status" IN (
    'ABIERTA', 'LISTA', 'COMPLETADA', 'CANCELADA', 'PAGADO', 'entregado', 'cancelado'
));

ALTER TABLE orders
ADD CONSTRAINT check_orders_type CHECK ("type" IN (
    'dine_in', 'takeaway', 'delivery', 'app'
));

CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant, "status");
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders("user");
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders("date" DESC);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select_own_or_staff ON orders
    FOR SELECT
    USING (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = orders.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY orders_insert_authenticated ON orders
    FOR INSERT
    WITH CHECK (
        "user" = current_user_id()
        AND current_user_id() IS NOT NULL
    );

CREATE POLICY orders_update_own_or_staff ON orders
    FOR UPDATE
    USING (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = orders.restaurant
            AND employees."user" = current_user_id()
        )
    )
    WITH CHECK (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = orders.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY orders_delete_admin ON orders
    FOR DELETE
    USING (current_user_role() = 'admin');

CREATE TRIGGER orders_updated_at_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
