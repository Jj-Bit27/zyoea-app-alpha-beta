------------------------------- Tablas Sobre la Pagina General ------------------------------------------------------

-- Tabla de Usuarios (Users)
CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" VARCHAR(100),
    "email" VARCHAR(100) UNIQUE,
    "password" VARCHAR(100),
    "role" VARCHAR(40),
    register_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    token_verification VARCHAR(100),
    token_expiration_verification TIMESTAMP,
    reset_token_password VARCHAR(100),
    reset_token_expiration_password TIMESTAMP
);

------------------------------ Tablas Sobre el Restaurante ------------------------------------------------------

-- Tabla de Restaurantes (Restaurants)
CREATE TABLE restaurants (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" VARCHAR(100),
    "address" VARCHAR(100),
    "email" VARCHAR(100),
    "description" TEXT,
    "image" TEXT NULL,
    phone VARCHAR(15),
    "hours" TEXT
);

-- Tabla de Empleados (Employees)
CREATE TABLE employees (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user" INT REFERENCES users(id) ON DELETE CASCADE,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    position VARCHAR(50),
    hire_date DATE
);

-- Tabla de Reseñas (Reviews)
CREATE TABLE reviews ( 
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    "user" INT REFERENCES users(id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Mesas (Tables)
CREATE TABLE tables (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    booking INT REFERENCES bookings(id) ON DELETE CASCADE,
    "number" INT,
    capacity INT,
    "status" VARCHAR(50)
);

-- Tabla de Reservas (Bookings)
CREATE TABLE bookings (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    "user" INT REFERENCES users(id) ON DELETE CASCADE,
    "table" INT REFERENCES tables(id) ON DELETE CASCADE,
    people INT,
    "time" TIMESTAMP,
    "status" TEXT NOT NULL
);

------------------------------ Tablas Sobre los Productos ------------------------------------------------------

-- Tabla de Categorías de Productos (Categories)
CREATE TABLE categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    "name" VARCHAR(100)
);

-- Tabla de Productos (Products)
CREATE TABLE products (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    category INT REFERENCES categories(id) ON DELETE CASCADE,
    "name" VARCHAR(100),
    "description" TEXT,
    ingredients TEXT,
    allergens TEXT,
    price DECIMAL(10,2),
    "status" BOOLEAN DEFAULT TRUE,
    "image" TEXT
);

-- Tabla de Pedidos (Orders)
CREATE TABLE orders (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user" INT REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NULL,
    restaurant INT REFERENCES restaurants(id) ON DELETE CASCADE,
    "table" INT REFERENCES tables(id),
    "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50),
    notes TEXT,
    total DECIMAL(10,2),
    "type" VARCHAR(50),
    paid BOOLEAN DEFAULT FALSE
);

-- Tabla de Detalles de Pedidos (Order Details)
CREATE TABLE order_details (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT,
    subtotal DECIMAL(10,2)
);

------------------------------ Tablas Sobre los Pagos ------------------------------------------------------

-- Tabla de Pagos (Payments)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    "user" VARCHAR(255) NOT NULL,
    
    -- IDs de Stripe
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_payment_method_id VARCHAR(255),
    
    -- Información del pago
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);