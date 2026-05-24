-- Tabla de Restaurantes (Restaurants)

CREATE TABLE restaurants (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(100),
    "email" VARCHAR(100),
    "description" TEXT,
    "image" TEXT NULL,
    phone VARCHAR(15),
    "hours" TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants("name");
CREATE INDEX IF NOT EXISTS idx_restaurants_deleted_at ON restaurants(deleted_at);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY restaurants_select_all ON restaurants
    FOR SELECT
    USING (deleted_at IS NULL OR current_user_role() = 'admin');

CREATE POLICY restaurants_insert_admin ON restaurants
    FOR INSERT
    WITH CHECK (current_user_role() = 'admin');

CREATE POLICY restaurants_update_owner_or_admin ON restaurants
    FOR UPDATE
    USING (
        current_user_role() = 'admin'
        OR current_user_role() = 'owner'
    )
    WITH CHECK (
        current_user_role() = 'admin'
        OR current_user_role() = 'owner'
    );

CREATE POLICY restaurants_delete_admin ON restaurants
    FOR DELETE
    USING (current_user_role() = 'admin');

CREATE TRIGGER restaurants_updated_at_trigger
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
