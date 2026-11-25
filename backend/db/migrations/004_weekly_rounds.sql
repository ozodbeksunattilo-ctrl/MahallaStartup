-- Haftalik ovoz davri oylik davr bilan PARALLEL ishlaydi.
--   voting_rounds.kind — davr turi; har bir mahallada har tur uchun bitta davr (period_start bo'yicha).
--   issues.round_kind  — muammo qaysi davrda ovozga chiqadi (aholi yuborishda tanlaydi).
-- Har bir davrda ovoz beruvchiga 3 ta slot (votes jadvalidagi cheklovlar davr bo'yicha, o'zgarmaydi).

ALTER TABLE voting_rounds
  ADD COLUMN kind text NOT NULL DEFAULT 'MONTHLY' CHECK (kind IN ('MONTHLY', 'WEEKLY'));

-- Oylik va haftalik davr bir kunda boshlanishi mumkin (masalan, oy 1-sanasi dushanba bo'lsa)
ALTER TABLE voting_rounds DROP CONSTRAINT IF EXISTS voting_rounds_mahalla_id_period_start_key;
CREATE UNIQUE INDEX voting_rounds_mahalla_kind_start_uq ON voting_rounds (mahalla_id, kind, period_start);

ALTER TABLE issues
  ADD COLUMN round_kind text NOT NULL DEFAULT 'MONTHLY' CHECK (round_kind IN ('MONTHLY', 'WEEKLY'));
