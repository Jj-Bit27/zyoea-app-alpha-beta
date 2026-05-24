-- Tabla de Mesas (Tables)
-- Nota: La FK a bookings(id) se agrega al final del archivo bookings.sql
-- para romper la dependencia circular entre tables y bookings.

CREATE TABLE tables (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    booking INT,
    "number" INT,
    capacity INT,
    "status" VARCHAR(50) DEFAULT 'available',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_restaurant_number ON tables(restaurant, "number");
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_status ON tables(restaurant, "status");

ALTER TABLE tables
ADD CONSTRAINT check_table_status CHECK ("status" IN (
    'available', 'occupied', 'reserved', 'maintenance', 'cleaning'
));

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY tables_select_restaurant_staff ON tables
    FOR SELECT
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = tables.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY tables_insert_restaurant_staff ON tables
    FOR INSERT
    WITH CHECK (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = tables.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY tables_update_restaurant_staff ON tables
    FOR UPDATE
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = tables.restaurant
            AND employees."user" = current_user_id()
        )
    )
    WITH CHECK (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = tables.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY tables_delete_restaurant_staff ON tables
    FOR DELETE
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = tables.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE TRIGGER tables_updated_at_trigger
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
