-- Tabla de Categorías de Productos (Categories)

CREATE TABLE categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_restaurant_name ON categories(restaurant, "name");
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_select_all ON categories
    FOR SELECT
    USING (true);

CREATE POLICY categories_insert_restaurant_staff ON categories
    FOR INSERT
    WITH CHECK (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = categories.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY categories_update_restaurant_staff ON categories
    FOR UPDATE
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = categories.restaurant
            AND employees."user" = current_user_id()
        )
    )
    WITH CHECK (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = categories.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY categories_delete_restaurant_staff ON categories
    FOR DELETE
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = categories.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE TRIGGER categories_updated_at_trigger
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
