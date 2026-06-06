-- Create Database
CREATE DATABASE kasama_rides_db;

\c kasama_rides_db;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('customer', 'driver', 'admin')) DEFAULT 'customer',
    profile_picture TEXT,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_rides INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Drivers Table
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    driver_license VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('bike', 'car', 'both')) DEFAULT 'bike',
    is_online BOOLEAN DEFAULT false,
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    last_location_update TIMESTAMP,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    completed_rides INTEGER DEFAULT 0,
    acceptance_rate DECIMAL(5,2) DEFAULT 100.00
);

-- Vehicles Table
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('bike', 'car', 'taxi')) NOT NULL,
    model VARCHAR(50),
    color VARCHAR(30),
    year INTEGER,
    capacity INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'available',
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_per_km DECIMAL(10,2),
    base_fare DECIMAL(10,2)
);

-- Rides Table
CREATE TABLE rides (
    id SERIAL PRIMARY KEY,
    ride_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES users(id),
    driver_id INTEGER REFERENCES drivers(id),
    vehicle_id INTEGER REFERENCES vehicles(id),
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10,8) NOT NULL,
    pickup_longitude DECIMAL(11,8) NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10,8),
    dropoff_longitude DECIMAL(11,8),
    distance_km DECIMAL(8,2),
    duration_minutes INTEGER,
    estimated_fare DECIMAL(10,2),
    actual_fare DECIMAL(10,2),
    status VARCHAR(30) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(30),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5)
);

-- Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER REFERENCES rides(id),
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(30),
    transaction_id VARCHAR(100) UNIQUE,
    mtn_momo_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Sample Data (password for all is 'password123')
-- Note: In production, use proper bcrypt hashes
INSERT INTO users (user_id, full_name, phone, password_hash, role) VALUES 
('ADMIN001', 'Kasama Admin', '+260970000001', '$2a$10$rQ0xQ5xQ5xQ5xQ5xQ5xQ5e', 'admin'),
('CUST001', 'John Mwila', '+260970000002', '$2a$10$rQ0xQ5xQ5xQ5xQ5xQ5xQ5e', 'customer'),
('DRV001', 'Kelvin Banda', '+260977123456', '$2a$10$rQ0xQ5xQ5xQ5xQ5xQ5xQ5e', 'driver');

INSERT INTO drivers (user_id, driver_license, vehicle_type, is_online, current_latitude, current_longitude) VALUES 
((SELECT id FROM users WHERE user_id = 'DRV001'), 'LIC123456', 'bike', true, -10.2100, 31.1800);

INSERT INTO vehicles (driver_id, registration_number, vehicle_type, model, color, current_latitude, current_longitude, price_per_km, base_fare) VALUES 
((SELECT id FROM drivers WHERE user_id = (SELECT id FROM users WHERE user_id = 'DRV001')), 'BCA 101', 'bike', 'Yamaha FZ', 'Black', -10.2100, 31.1800, 2.50, 10.00);