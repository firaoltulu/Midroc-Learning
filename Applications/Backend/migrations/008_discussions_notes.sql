BEGIN;

-- Questions and answers on a course item ("Discussions"): a post starts a thread, replies point
-- at it (one level). Deleting a thread deletes its replies.
CREATE TABLE discussion_posts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid        NOT NULL REFERENCES module_items (id)     ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users (id)            ON DELETE CASCADE,
  parent_id  uuid                 REFERENCES discussion_posts (id) ON DELETE CASCADE,
  body       text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX discussion_posts_item_threads_idx
  ON discussion_posts (item_id, created_at DESC) WHERE parent_id IS NULL;
CREATE INDEX discussion_posts_parent_idx ON discussion_posts (parent_id, created_at);

CREATE TRIGGER discussion_posts_set_updated_at
  BEFORE UPDATE ON discussion_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A learner's private notes on an item ("Notes"), optionally at a point in a video.
CREATE TABLE item_notes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          uuid        NOT NULL REFERENCES module_items (id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES users (id)        ON DELETE CASCADE,
  body             text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  position_seconds integer     CHECK (position_seconds IS NULL OR position_seconds >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX item_notes_user_item_idx ON item_notes (user_id, item_id, created_at);

CREATE TRIGGER item_notes_set_updated_at
  BEFORE UPDATE ON item_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
