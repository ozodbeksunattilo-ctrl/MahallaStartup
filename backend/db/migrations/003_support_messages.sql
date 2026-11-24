-- Aholi va mahalla admini o'rtasidagi shaxsiy chat: har bir aholi uchun bitta suhbat (resident_id).
CREATE TABLE support_messages (
  id                 uuid PRIMARY KEY,
  mahalla_id         uuid NOT NULL REFERENCES mahalla (id),
  resident_id        uuid NOT NULL REFERENCES users (id),
  sender_id          uuid NOT NULL REFERENCES users (id),
  text               text NOT NULL,
  client_message_id  text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sender_id, client_message_id)
);
CREATE INDEX support_messages_thread_idx ON support_messages (resident_id, id);
