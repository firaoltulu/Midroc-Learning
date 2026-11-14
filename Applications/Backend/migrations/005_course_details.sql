BEGIN;

-- Course page details: the level, "What you'll learn" (outcomes) and "Skills you'll gain".
ALTER TABLE courses
  ADD COLUMN level text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN outcomes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN skills text[] NOT NULL DEFAULT '{}';

-- Catalog "New" and category counts read published courses only.
CREATE INDEX courses_published_at_idx ON courses (published_at DESC) WHERE status = 'published';

COMMIT;
