-- 003_youtube_video.sql — video_items for YouTube unlisted links
-- Run after 002_course_content.sql. Assumes no production video rows yet
-- (it drops the generic provider/source columns from 002).

BEGIN;

ALTER TABLE video_items
  DROP COLUMN provider,
  DROP COLUMN source;

ALTER TABLE video_items
  -- The 11-character YouTube video id (not the full URL). The backend
  -- extracts it from whatever link format the owner pastes.
  ADD COLUMN youtube_video_id text NOT NULL
    CHECK (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  -- Cached from oEmbed at save time, for admin/moderation views
  ADD COLUMN youtube_title    text,
  ADD COLUMN thumbnail_url    text,
  -- Set by a periodic check that the video is still reachable; NULL = never checked
  ADD COLUMN last_checked_at  timestamptz,
  ADD COLUMN is_available     boolean NOT NULL DEFAULT true;

-- Find videos to re-check and broken ones to flag to owners/admins
CREATE INDEX video_items_availability_idx
  ON video_items (is_available, last_checked_at);

COMMIT;
