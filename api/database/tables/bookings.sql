-- Tabla de Reservas (Bookings)

CREATE TABLE bookings (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    "user" INT REFERENCES users(id) ON DELETE SET NULL,
    "table" INT REFERENCES tables(id) ON DELETE SET NULL,
    people INT NOT NULL,
    "time" TIMESTAMP NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bookings
ADD CONSTRAINT check_bookings_people CHECK (people > 0);

ALTER TABLE bookings
ADD CONSTRAINT check_booking_status CHECK ("status" IN (
    'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
));

CREATE INDEX IF NOT EXISTS idx_bookings_restaurant ON bookings(restaurant);
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_time ON bookings(restaurant, "time");
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings("user");
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings("status");

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookings_select_own_or_staff ON bookings
    FOR SELECT
    USING (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = bookings.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY bookings_insert_authenticated ON bookings
    FOR INSERT
    WITH CHECK (
        "user" = current_user_id()
        AND current_user_id() IS NOT NULL
    );

CREATE POLICY bookings_update_own_or_staff ON bookings
    FOR UPDATE
    USING (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = bookings.restaurant
            AND employees."user" = current_user_id()
        )
    )
    WITH CHECK (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees
            WHERE employees.restaurant = bookings.restaurant
            AND employees."user" = current_user_id()
        )
    );

CREATE POLICY bookings_delete_own_or_admin ON bookings
    FOR DELETE
    USING (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
    );

CREATE TRIGGER bookings_updated_at_trigger
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Agregar FK circular desde tables.booking hacia bookings.id
ALTER TABLE tables
    ADD CONSTRAINT fk_tables_booking
    FOREIGN KEY (booking) REFERENCES bookings(id) ON DELETE SET NULL;
