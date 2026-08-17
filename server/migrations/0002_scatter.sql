-- Leftover volumes without zines ignore this ALTER (0002 policy). Do not skip the file in the runner.
ALTER TABLE zines ADD COLUMN scatter INTEGER NOT NULL DEFAULT 0;
