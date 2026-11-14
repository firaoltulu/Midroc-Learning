BEGIN;

-- Learner ratings (1-5 stars) with an optional comment: one per learner and course.
CREATE TABLE course_reviews (
  course_id  uuid        NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
  rating     smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text        NOT NULL DEFAULT '' CHECK (char_length(comment) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, user_id)
);

CREATE INDEX course_reviews_course_updated_idx ON course_reviews (course_id, updated_at DESC);

CREATE TRIGGER course_reviews_set_updated_at
  BEFORE UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
