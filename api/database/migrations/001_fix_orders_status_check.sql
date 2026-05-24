-- Fix check constraint on orders.status to use Spanish values matching the application
-- Run this against your existing database if orders already exist with the old constraint.

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
