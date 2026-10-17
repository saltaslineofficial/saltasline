-- SALTAŞLİNE PayTR sipariş kayıtları
-- D1 veritabanına wrangler d1 execute komutuyla uygulanır.
-- Adres/iletişim verilerinin saklanması için KVKK ve erişim kontrolleri ayrıca gözden geçirilmelidir.
CREATE TABLE IF NOT EXISTS orders (
  merchant_oid TEXT PRIMARY KEY,
  receipt TEXT NOT NULL UNIQUE,
  buyer_json TEXT NOT NULL,
  items_json TEXT NOT NULL,
  expected_amount INTEGER NOT NULL CHECK (expected_amount > 0),
  paid_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'init_failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
