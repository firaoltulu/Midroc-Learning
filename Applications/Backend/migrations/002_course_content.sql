-- 002_course_content.sql — modules, content items, exams, progress
-- Run after 001_init.sql.

BEGIN;

CREATE TYPE item_type AS ENUM ('video', 'pdf', 'exam');

-- ---------------------------------------------------------------
-- modules
-- Position uniqueness is DEFERRABLE so a reorder can swap positions
-- inside one transaction without tripping the constraint.
-- ---------------------------------------------------------------
CREATE TABLE modules (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  position    integer     NOT NULL CHECK (position >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER modules_set_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------
-- module_items: one ordered list per module (video, pdf, exam mixed)
-- UNIQUE (id, type) lets the detail tables below prove their type.
-- ---------------------------------------------------------------
CREATE TABLE module_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id  uuid        NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
  type       item_type   NOT NULL,
  title      text        NOT NULL,
  position   integer     NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, type),
  UNIQUE (module_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER module_items_set_updated_at
  BEFORE UPDATE ON module_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------
-- Type-specific detail tables (1:1 with module_items)
-- The composite FK (item_id, type) guarantees a video_items row can
-- only attach to an item whose type is 'video', and so on.
-- ---------------------------------------------------------------
CREATE TABLE video_items (
  item_id          uuid      PRIMARY KEY,
  type             item_type NOT NULL DEFAULT 'video' CHECK (type = 'video'),
  provider         text      NOT NULL,            -- e.g. 'storage', 'youtube', 'vimeo', 'mux'
  source           text      NOT NULL,            -- storage path or provider video id
  duration_seconds integer   CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  FOREIGN KEY (item_id, type) REFERENCES module_items (id, type) ON DELETE CASCADE
);

CREATE TABLE pdf_items (
  item_id    uuid      PRIMARY KEY,
  type       item_type NOT NULL DEFAULT 'pdf' CHECK (type = 'pdf'),
  file_path  text      NOT NULL,                  -- storage path, not a public URL
  size_bytes bigint    CHECK (size_bytes IS NULL OR size_bytes >= 0),
  page_count integer   CHECK (page_count IS NULL OR page_count > 0),
  FOREIGN KEY (item_id, type) REFERENCES module_items (id, type) ON DELETE CASCADE
);

CREATE TABLE exams (
  item_id               uuid      PRIMARY KEY,
  type                  item_type NOT NULL DEFAULT 'exam' CHECK (type = 'exam'),
  instructions          text      NOT NULL DEFAULT '',
  passing_score_percent integer   NOT NULL DEFAULT 60 CHECK (passing_score_percent BETWEEN 0 AND 100),
  max_attempts          integer   CHECK (max_attempts IS NULL OR max_attempts > 0),  -- NULL = unlimited
  time_limit_minutes    integer   CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  FOREIGN KEY (item_id, type) REFERENCES module_items (id, type) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- Exam questions and choices
-- is_correct must NEVER be returned to learners before submission.
-- ---------------------------------------------------------------
CREATE TABLE exam_questions (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     uuid    NOT NULL REFERENCES exams (item_id) ON DELETE CASCADE,
  prompt      text    NOT NULL,
  is_multiple boolean NOT NULL DEFAULT false,     -- true = several correct choices allowed
  points      integer NOT NULL DEFAULT 1 CHECK (points > 0),
  position    integer NOT NULL CHECK (position >= 0),
  UNIQUE (exam_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE exam_choices (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid    NOT NULL REFERENCES exam_questions (id) ON DELETE CASCADE,
  text        text    NOT NULL,
  is_correct  boolean NOT NULL DEFAULT false,
  position    integer NOT NULL CHECK (position >= 0),
  UNIQUE (question_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- ---------------------------------------------------------------
-- Exam attempts. Score and pass/fail are computed by the backend at
-- submit time and stored, so later edits to an exam don't rewrite
-- history.
-- ---------------------------------------------------------------
CREATE TABLE exam_attempts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  exam_id       uuid        NOT NULL REFERENCES exams (item_id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  submitted_at  timestamptz,
  score_percent numeric(5,2) CHECK (score_percent IS NULL OR score_percent BETWEEN 0 AND 100),
  passed        boolean
);

CREATE INDEX exam_attempts_user_exam_idx ON exam_attempts (user_id, exam_id, started_at DESC);

-- One row per selected choice (several rows for multi-select questions).
-- Plain uuid columns, not FKs to choices: an admin may later delete a
-- choice, and the attempt record should survive.
CREATE TABLE exam_attempt_answers (
  attempt_id  uuid NOT NULL REFERENCES exam_attempts (id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  choice_id   uuid NOT NULL,
  PRIMARY KEY (attempt_id, question_id, choice_id)
);

-- ---------------------------------------------------------------
-- Learner progress per item (video resume position, PDF/video
-- completion). Exams count as complete when a passing attempt exists.
-- The backend must check enrollment before writing here.
-- ---------------------------------------------------------------
CREATE TABLE item_progress (
  user_id               uuid        NOT NULL REFERENCES users (id)        ON DELETE CASCADE,
  item_id               uuid        NOT NULL REFERENCES module_items (id) ON DELETE CASCADE,
  last_position_seconds integer     CHECK (last_position_seconds IS NULL OR last_position_seconds >= 0),
  completed_at          timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TRIGGER item_progress_set_updated_at
  BEFORE UPDATE ON item_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
