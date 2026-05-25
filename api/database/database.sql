-- Funciones helper compartidas para RLS y triggers
-- Ejecutar antes que cualquier archivo de tablas

-- Helper: obtener ID del usuario actual desde variable de sesión
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INT AS $$
    SELECT current_setting('app.user_id', true)::INT;
$$ LANGUAGE SQL STABLE;

-- Helper: obtener rol del usuario actual desde variable de sesión
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT current_setting('app.user_role', true);
$$ LANGUAGE SQL STABLE;

-- Trigger genérico para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Tabla de Usuarios (Users) y Empleados (Employees)

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
