-- Tabla de Usuarios (Users) y Empleados (Employees)

CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" VARCHAR(100),
    "email" VARCHAR(100) UNIQUE NOT NULL,
    "password" VARCHAR(255),
    "role" VARCHAR(40) DEFAULT 'user',
    register_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
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
