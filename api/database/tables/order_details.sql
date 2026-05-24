-- Tabla de Detalles de Pedidos (Order Details)

CREATE TABLE order_details (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE order_details
ADD CONSTRAINT check_order_details_quantity CHECK (quantity > 0);

ALTER TABLE order_details
ADD CONSTRAINT check_order_details_subtotal CHECK (subtotal >= 0);

CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_product_id ON order_details(product_id);

ALTER TABLE order_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_details_select_own_or_staff ON order_details
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_details.order_id
            AND (
                orders."user" = current_user_id()
                OR current_user_role() = 'admin'
                OR EXISTS (
                    SELECT 1 FROM employees
                    WHERE employees.restaurant = orders.restaurant
                    AND employees."user" = current_user_id()
                )
            )
        )
    );

CREATE POLICY order_details_insert_authenticated ON order_details
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_details.order_id
            AND (
                orders."user" = current_user_id()
                OR current_user_role() = 'admin'
            )
        )
    );

CREATE POLICY order_details_update_staff ON order_details
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_details.order_id
            AND (
                current_user_role() = 'admin'
                OR EXISTS (
                    SELECT 1 FROM employees
                    WHERE employees.restaurant = orders.restaurant
                    AND employees."user" = current_user_id()
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_details.order_id
            AND (
                current_user_role() = 'admin'
                OR EXISTS (
                    SELECT 1 FROM employees
                    WHERE employees.restaurant = orders.restaurant
                    AND employees."user" = current_user_id()
                )
            )
        )
    );

CREATE POLICY order_details_delete_staff ON order_details
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_details.order_id
            AND (
                current_user_role() = 'admin'
                OR EXISTS (
                    SELECT 1 FROM employees
                    WHERE employees.restaurant = orders.restaurant
                    AND employees."user" = current_user_id()
                )
            )
        )
    );

CREATE TRIGGER order_details_updated_at_trigger
    BEFORE UPDATE ON order_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
