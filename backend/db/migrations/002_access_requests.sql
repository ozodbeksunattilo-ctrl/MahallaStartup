-- Aholining kirish so'rovlari (mobil «Ro'yxatdan o'tish»): mahalla admini ko'rib chiqadi va akkaunt yaratadi.
CREATE TABLE access_requests (
  id            uuid PRIMARY KEY,
  mahalla_id    uuid NOT NULL REFERENCES mahalla(id),
  full_name     text NOT NULL,
  phone         text NOT NULL,
  address       text,
  status        text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  note          text,
  user_id       uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz,
  decided_by    uuid REFERENCES users(id)
);
CREATE INDEX access_requests_mahalla_idx ON access_requests (mahalla_id, status, created_at DESC, id DESC);
