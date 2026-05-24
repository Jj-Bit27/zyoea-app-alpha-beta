-- Tabla de Productos (Products)

CREATE TABLE products (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    category INT REFERENCES categories(id) ON DELETE SET NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    ingredients TEXT,
    allergens TEXT,
    price DECIMAL(10,2) NOT NULL,
    "status" BOOLEAN DEFAULT TRUE,
    "image" TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

ALTER TABLE products
ADD CONSTRAINT check_products_price CHECK (price >= 0);

CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant);
CREATE INDEX IF NOT EXISTS idx_products_restaurant_category ON products(restaurant, category);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select_all ON products
    FOR SELECT
    USING (deleted_at IS NULL OR current_user_role() = 'admin');

CREATE POLICY products_insert_restaurant_staff ON products
    FOR INSERT
    WITH CHECK (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = products.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY products_update_restaurant_staff ON products
    FOR UPDATE
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = products.restaurant
            AND employees."user" = current_user_id()
        )
    )
    WITH CHECK (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = products.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY products_delete_restaurant_staff ON products
    FOR DELETE
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = products.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE TRIGGER products_updated_at_trigger
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
