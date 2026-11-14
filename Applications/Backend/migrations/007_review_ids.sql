BEGIN;

-- A stable id per review, so administrators can remove one without the API exposing who
-- wrote it (the primary key is course + user).
ALTER TABLE course_reviews ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE course_reviews ADD CONSTRAINT course_reviews_id_key UNIQUE (id);

COMMIT;
