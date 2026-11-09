-- Lozz Cake: PostgreSQL schema for orders, add-ons and R2 image metadata.
-- Run once in the target PostgreSQL database. Actual image bytes stay in Cloudflare R2.

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    moderator_name VARCHAR(150) NOT NULL,

    fulfillment_method VARCHAR(20) NOT NULL
        CHECK (fulfillment_method IN ('delivery', 'pickup')),
    city VARCHAR(30),
    area VARCHAR(200),
    address_details TEXT,
    delivery_date DATE NOT NULL,
    delivery_time_from VARCHAR(8) NOT NULL,
    delivery_time_to VARCHAR(8),

    cake_type VARCHAR(40) NOT NULL,
    cake_size VARCHAR(40) NOT NULL,
    dimensions VARCHAR(100),
    number_of_tiers SMALLINT CHECK (number_of_tiers IS NULL OR number_of_tiers > 0),
    filling VARCHAR(40),
    covering VARCHAR(40),
    details TEXT,

    base_price_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_price_egp >= 0),
    cake_design_extra_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cake_design_extra_egp >= 0),
    add_ons_total_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (add_ons_total_egp >= 0),
    delivery_fee_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee_egp >= 0),
    discount_type VARCHAR(20) NOT NULL DEFAULT 'none'
        CHECK (discount_type IN ('none', 'percentage', 'amount')),
    discount_input_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_input_value >= 0),
    discount_amount_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount_egp >= 0),
    total_order_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_order_egp >= 0),

    deposit_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (deposit_egp >= 0),
    remaining_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (remaining_egp >= 0),
    order_status VARCHAR(50) NOT NULL DEFAULT 'قيد التأكيد',
    order_summary TEXT,

    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT orders_delivery_time_from_format CHECK (
        delivery_time_from = 'last' OR delivery_time_from ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$'
    ),
    CONSTRAINT orders_delivery_time_to_format CHECK (
        delivery_time_to IS NULL OR delivery_time_to ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$'
    ),
    CONSTRAINT orders_last_time_has_no_end CHECK (
        delivery_time_from <> 'last' OR delivery_time_to IS NULL
    )
);

CREATE TABLE IF NOT EXISTS order_addons (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL,
    product_name VARCHAR(250) NOT NULL,
    unit VARCHAR(80) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    unit_price_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price_egp >= 0),
    design_extra_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (design_extra_egp >= 0),
    total_egp NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_egp >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_images (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    image_type VARCHAR(20) NOT NULL CHECK (image_type IN ('cake', 'deposit')),
    file_name TEXT NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_moderator ON orders(moderator_name);
CREATE INDEX IF NOT EXISTS idx_order_addons_order_id ON order_addons(order_id);
CREATE INDEX IF NOT EXISTS idx_order_images_order_id ON order_images(order_id);
CREATE INDEX IF NOT EXISTS idx_order_images_active ON order_images(order_id, is_active);
