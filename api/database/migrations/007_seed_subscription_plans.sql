INSERT INTO subscription_plans (name, description, price, interval, features, max_restaurants, max_employees, max_products)
SELECT 'Básico', 'Perfecto para empezar', 299.00, 'month', '["Hasta 50 productos","5 empleados","1 restaurante","Soporte por correo"]', 1, 5, 50
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Básico');

INSERT INTO subscription_plans (name, description, price, interval, features, max_restaurants, max_employees, max_products)
SELECT 'Premium', 'Para restaurantes en crecimiento', 599.00, 'month', '["Productos ilimitados","20 empleados","Hasta 3 restaurantes","Soporte prioritario","Estadísticas avanzadas","QR ilimitados"]', 3, 20, 999999
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Premium');
