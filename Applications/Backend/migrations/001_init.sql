-- 001_init.sql — learning platform schema
-- Requires Postgres 13+ (gen_random_uuid is built in).

BEGIN;

-- ---------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------
CREATE TYPE user_role       AS ENUM ('user', 'admin');
CREATE TYPE user_status     AS ENUM ('active', 'suspended');
CREATE TYPE course_status   AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'archived');
CREATE TYPE revision_status AS ENUM ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------
-- users
-- Source of truth for roles. The role is mirrored into a Firebase
-- custom claim for frontend route guarding only.
-- Rows are created on first login (upsert by firebase_uid).
-- ---------------------------------------------------------------
CREATE TABLE users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  text        NOT NULL UNIQUE,
  email         text        NOT NULL,
  name          text,
  role          user_role   NOT NULL DEFAULT 'user',
  status        user_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_role_idx ON users (role);
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------
-- courses
-- Holds the live, approved content. While a published course has a
-- pending major revision, this row stays unchanged and published.
-- ---------------------------------------------------------------
CREATE TABLE courses (
  id                         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                   uuid          NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title                      text          NOT NULL,
  description                text          NOT NULL DEFAULT '',
  category                   text,
  thumbnail_url              text,
  tags                       text[]        NOT NULL DEFAULT '{}',
  estimated_duration_minutes integer       CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes >= 0),
  status                     course_status NOT NULL DEFAULT 'draft',
  rejection_reason           text,
  reviewed_by                uuid          REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at                timestamptz,
  published_at               timestamptz,
  created_at                 timestamptz   NOT NULL DEFAULT now(),
  updated_at                 timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX courses_owner_idx    ON courses (owner_id);
CREATE INDEX courses_status_idx   ON courses (status);
-- Catalog listing: published courses, newest first
CREATE INDEX courses_catalog_idx  ON courses (published_at DESC) WHERE status = 'published';
CREATE INDEX courses_category_idx ON courses (category) WHERE status = 'published';

CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------
-- course_revisions
-- Proposed major changes to a published course. `data` is JSONB so
-- it can later hold a snapshot of the whole editable course tree
-- (modules/lessons) without schema changes.
-- ---------------------------------------------------------------
CREATE TABLE course_revisions (
  id               uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        uuid            NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  data             jsonb           NOT NULL,
  status           revision_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  submitted_by     uuid            NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  submitted_at     timestamptz     NOT NULL DEFAULT now(),
  reviewed_by      uuid            REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at      timestamptz
);

-- One open (pending) revision per course. A second major edit
-- updates the existing pending row instead of queueing another.
CREATE UNIQUE INDEX course_revisions_one_pending_idx
  ON course_revisions (course_id)
  WHERE status = 'pending';

-- Moderation queue: oldest pending first
CREATE INDEX course_revisions_queue_idx
  ON course_revisions (submitted_at)
  WHERE status = 'pending';

-- ---------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------
CREATE TABLE enrollments (
  user_id     uuid        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
  course_id   uuid        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

-- Analytics: enrollments per course over time
CREATE INDEX enrollments_course_time_idx ON enrollments (course_id, enrolled_at);
-- "My enrollments", newest first
CREATE INDEX enrollments_user_time_idx   ON enrollments (user_id, enrolled_at DESC);

COMMIT;
