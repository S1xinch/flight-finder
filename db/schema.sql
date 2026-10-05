CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verify_hash TEXT,
  reset_hash TEXT,
  reset_expires TIMESTAMPTZ,
  email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  depart_date DATE NOT NULL,
  return_date TEXT NOT NULL DEFAULT '',
  UNIQUE (origin, destination, depart_date, return_date)
);
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  baggage_included BOOLEAN,
  stops INT,
  airline TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_history_route_ts ON price_history (route_id, timestamp DESC);
CREATE TABLE IF NOT EXISTS saved_searches (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date TEXT NOT NULL DEFAULT '',
  passengers INT NOT NULL DEFAULT 1,
  cabin TEXT NOT NULL DEFAULT 'economy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flight_data TEXT NOT NULL,
  confirmation_number TEXT NOT NULL,
  total_price NUMERIC,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  passengers INT NOT NULL DEFAULT 1,
  cabin TEXT NOT NULL DEFAULT 'economy',
  drop_pct INT NOT NULL DEFAULT 10,
  price_threshold NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  alert_status TEXT NOT NULL DEFAULT 'active',
  last_price NUMERIC,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
