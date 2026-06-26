-- No DB change needed: orderDetail field type change is GraphQL-only.
-- However, ensure we have a proper FK index.
CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details(order_id);
