-- ============================================================================
-- COMPLETE DATABASE SCHEMA
-- Order: Helpers → Tables → Migrations → New Tables
-- ============================================================================

-- ============================================================================
-- SECTION 1: HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INT AS $$
    SELECT current_setting('app.user_id', true)::INT;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT current_setting('app.user_role', true);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 2: BASE TABLES
-- ============================================================================

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
    stripe_connect_account_id VARCHAR(255) UNIQUE,
    stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
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

-- Tabla de Usuarios (Users)
CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" VARCHAR(100),
    "email" VARCHAR(100) UNIQUE NOT NULL,
    "password" VARCHAR(255),
    "role" VARCHAR(40) DEFAULT 'user',
    register_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    allergies TEXT,
    token_verification VARCHAR(100),
    token_expiration_verification TIMESTAMP,
    reset_token_password VARCHAR(100),
    reset_token_expiration_password TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (
        id = current_user_id()
        OR current_user_role() = 'admin'
    );

CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (id = current_user_id() OR current_user_role() = 'admin')
    WITH CHECK (id = current_user_id() OR current_user_role() = 'admin');

CREATE POLICY users_insert_self ON users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY users_delete_admin ON users
    FOR DELETE
    USING (current_user_role() = 'admin');

CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Tabla de Empleados (Employees)
CREATE TABLE employees (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user" INT REFERENCES users(id) ON DELETE SET NULL,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    position VARCHAR(50),
    hire_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_user ON employees("user");
CREATE INDEX IF NOT EXISTS idx_employees_restaurant ON employees(restaurant);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_select_own ON employees
    FOR SELECT
    USING (
        "user" = current_user_id()
        OR current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees e2
            WHERE e2.restaurant = employees.restaurant
            AND e2."user" = current_user_id()
        )
    );

CREATE POLICY employees_insert_restaurant_staff ON employees
    FOR INSERT
    WITH CHECK (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees e2
            WHERE e2.restaurant = employees.restaurant
            AND e2."user" = current_user_id()
        )
    );

CREATE POLICY employees_update_restaurant_staff ON employees
    FOR UPDATE
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees e2
            WHERE e2.restaurant = employees.restaurant
            AND e2."user" = current_user_id()
        )
    )
    WITH CHECK (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees e2
            WHERE e2.restaurant = employees.restaurant
            AND e2."user" = current_user_id()
        )
    );

CREATE POLICY employees_delete_restaurant_staff ON employees
    FOR DELETE
    USING (
        current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM employees e2
            WHERE e2.restaurant = employees.restaurant
            AND e2."user" = current_user_id()
        )
    );

CREATE TRIGGER employees_updated_at_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Tabla de Mesas (Tables)
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
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

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

-- Add circular FK from tables to bookings
ALTER TABLE tables
    ADD CONSTRAINT fk_tables_booking
    FOREIGN KEY (booking) REFERENCES bookings(id) ON DELETE SET NULL;

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
    idempotency_key UUID UNIQUE,
    estimated_wait_time INT DEFAULT 0,
    actual_wait_time INT,
    completed_at TIMESTAMP,
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
CREATE INDEX IF NOT EXISTS idx_orders_estimated_wait_time ON orders(estimated_wait_time);
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at DESC);

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

-- Tabla de Pagos (Payments)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    "user" INT NOT NULL REFERENCES users(id),
    order_id INT REFERENCES orders(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_payment_method_id VARCHAR(255),
    stripe_application_fee_amount DECIMAL(10, 2),
    payment_method_type VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments("user");
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

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

-- ============================================================================
-- SECTION 3: MIGRATIONS
-- ============================================================================

-- Migration 001: Fix orders status check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_orders_status;

ALTER TABLE orders
ADD CONSTRAINT check_orders_status CHECK ("status" IN (
    'ABIERTA', 'LISTA', 'COMPLETADA', 'CANCELADA', 'PAGADO', 'entregado', 'cancelado'
));

ALTER TABLE orders ALTER COLUMN "status" SET DEFAULT 'ABIERTA';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_orders_type;

ALTER TABLE orders
ADD CONSTRAINT check_orders_type CHECK ("type" IN (
    'dine_in', 'takeaway', 'delivery', 'app'
));

-- Migration 002: Add wait time fields (already in table definition above)

-- Migration 003: Create wait time config tables
CREATE TABLE IF NOT EXISTS restaurant_wait_config (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id INT NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
    base_time INT NOT NULL DEFAULT 3,
    avg_prep_time INT NOT NULL DEFAULT 12,
    peak_hour_start INT NOT NULL DEFAULT 12,
    peak_hour_end INT NOT NULL DEFAULT 14,
    peak_factor DECIMAL(3,2) NOT NULL DEFAULT 1.5,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurant_wait_config_restaurant_id 
ON restaurant_wait_config(restaurant_id);

CREATE TABLE IF NOT EXISTS order_metrics (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_count INT NOT NULL,
    prepared_time_minutes INT NOT NULL,
    queue_position INT NOT NULL,
    was_peak_hour BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_metrics_restaurant_id 
ON order_metrics(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_order_metrics_created_at 
ON order_metrics(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_metrics_peak_hour 
ON order_metrics(restaurant_id, was_peak_hour);

-- ============================================================================
-- SECTION 4: NEW TABLES FOR PHASE 1-3 FEATURES
-- ============================================================================

-- Table: Restaurant Payment Methods (Stripe Connect)
CREATE TABLE IF NOT EXISTS restaurant_payment_methods (
    id SERIAL PRIMARY KEY,
    restaurant_id INT NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
    stripe_connect_account_id VARCHAR(255) UNIQUE,
    stripe_onboarding_url TEXT,
    stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
    account_holder_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) DEFAULT 'bank_account',
    bank_account_last4 VARCHAR(4),
    routing_number VARCHAR(50),
    country_code VARCHAR(2) DEFAULT 'MX',
    status VARCHAR(50) DEFAULT 'pending',
    verification_required_at TIMESTAMP,
    activated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurant_payment_methods_restaurant_id ON restaurant_payment_methods(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_payment_methods_status ON restaurant_payment_methods(status);

-- Table: User Carts (Persistent Cart)
CREATE TABLE IF NOT EXISTS user_carts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    restaurant_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON user_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_carts_product_id ON user_carts(product_id);

-- Table: Terms Acceptance
CREATE TABLE IF NOT EXISTS terms_acceptance (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_type VARCHAR(50) NOT NULL,
    accepted_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    version VARCHAR(10) DEFAULT '1.0',
    UNIQUE(user_id, terms_type)
);

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user_id ON terms_acceptance(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_type ON terms_acceptance(terms_type);

-- Table: IP Rate Limits
CREATE TABLE IF NOT EXISTS ip_rate_limits (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    request_count INT DEFAULT 0,
    last_request TIMESTAMP DEFAULT NOW(),
    is_banned BOOLEAN DEFAULT FALSE,
    ban_expires_at TIMESTAMP,
    ban_reason VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_is_banned ON ip_rate_limits(is_banned);
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_ban_expires ON ip_rate_limits(ban_expires_at);

-- Table: User Rate Limits
CREATE TABLE IF NOT EXISTS user_rate_limits (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    request_count INT DEFAULT 0,
    last_request TIMESTAMP DEFAULT NOW(),
    violation_count INT DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_rate_limits_is_blocked ON user_rate_limits(is_blocked);
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_block_expires ON user_rate_limits(block_expires_at);

-- ============================================================================
-- SECTION 5: SUBSCRIPTION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    interval VARCHAR(20) NOT NULL DEFAULT 'month',
    stripe_price_id VARCHAR(255),
    features TEXT,
    max_restaurants INT DEFAULT 1,
    max_employees INT DEFAULT 5,
    max_products INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_id ON subscription_plans(stripe_price_id);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_plans_select_all ON subscription_plans
    FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS restaurant_subscriptions (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id INT NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurant_subscriptions_restaurant ON restaurant_subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_subscriptions_status ON restaurant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_subscriptions_stripe ON restaurant_subscriptions(stripe_subscription_id);

ALTER TABLE restaurant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY restaurant_subscriptions_select_admin ON restaurant_subscriptions
    FOR SELECT USING (current_user_role() = 'admin');

CREATE POLICY restaurant_subscriptions_insert_admin ON restaurant_subscriptions
    FOR INSERT WITH CHECK (current_user_role() = 'admin');

CREATE POLICY restaurant_subscriptions_update_admin ON restaurant_subscriptions
    FOR UPDATE USING (current_user_role() = 'admin')
    WITH CHECK (current_user_role() = 'admin');
