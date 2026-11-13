BEGIN;

ALTER TABLE courses
  ADD COLUMN language text NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'am'));

CREATE INDEX courses_language_status_idx ON courses (language, status);

COMMIT;
