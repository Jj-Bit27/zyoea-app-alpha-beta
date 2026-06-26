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
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id)
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
