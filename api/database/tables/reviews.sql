-- Tabla de Reseñas (Reviews)

CREATE TABLE reviews (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    "user" INT REFERENCES users(id) ON DELETE SET NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_rating ON reviews(restaurant, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews("user");

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_select_all ON reviews
    FOR SELECT
    USING (true);

CREATE POLICY reviews_insert_authenticated ON reviews
    FOR INSERT
    WITH CHECK (
        "user" = current_user_id()
        AND current_user_id() IS NOT NULL
    );

CREATE POLICY reviews_update_own ON reviews
    FOR UPDATE
    USING ("user" = current_user_id())
    WITH CHECK ("user" = current_user_id());

CREATE POLICY reviews_delete_own_or_admin ON reviews
    FOR DELETE
    USING (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
    );

CREATE TRIGGER reviews_updated_at_trigger
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
