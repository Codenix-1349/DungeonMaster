ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS memory_summary TEXT DEFAULT '';

UPDATE sessions
SET memory_summary = ''
WHERE memory_summary IS NULL;
