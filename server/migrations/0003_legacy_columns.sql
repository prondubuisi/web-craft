CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  PRIMARY KEY (user_id, zine_id)
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  zine_id TEXT,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  swapped INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  postcard INTEGER NOT NULL DEFAULT 0,
  vibe TEXT
);
CREATE TABLE IF NOT EXISTS nominations (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id)
);
CREATE TABLE IF NOT EXISTS jams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'any',
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fest_tables (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scene TEXT NOT NULL DEFAULT '',
  blurb TEXT NOT NULL DEFAULT '',
  zine_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS poll_votes (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  option_idx INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id, block_id)
);
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  zine_id TEXT,
  body TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS guestbook (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shelves (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id)
);
CREATE TABLE IF NOT EXISTS page_stats (
  zine_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  dwell_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (zine_id, page)
);
CREATE TABLE IF NOT EXISTS bags (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (zine_id, user_id)
);
CREATE TABLE IF NOT EXISTS claims (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id)
);
CREATE TABLE IF NOT EXISTS series_watches (
  user_id TEXT NOT NULL,
  series TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, series)
);
CREATE TABLE IF NOT EXISTS table_sits (
  user_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, table_id)
);
CREATE TABLE IF NOT EXISTS loans (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id)
);
CREATE TABLE IF NOT EXISTS cork_pins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  rotation REAL NOT NULL DEFAULT 0,
  src TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stamps (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id)
);
CREATE TABLE IF NOT EXISTS margins (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN remix_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN kind TEXT NOT NULL DEFAULT 'human';
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN scene TEXT NOT NULL DEFAULT '';

ALTER TABLE zines ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE zines ADD COLUMN share_key TEXT;
ALTER TABLE zines ADD COLUMN pass_hash TEXT;
ALTER TABLE zines ADD COLUMN pass_salt TEXT;
ALTER TABLE zines ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE zines ADD COLUMN finish TEXT NOT NULL DEFAULT 'clean';
ALTER TABLE zines ADD COLUMN chain_key TEXT;
ALTER TABLE zines ADD COLUMN chain_open INTEGER NOT NULL DEFAULT 0;
ALTER TABLE zines ADD COLUMN series TEXT NOT NULL DEFAULT '';
ALTER TABLE zines ADD COLUMN issue_no INTEGER;
ALTER TABLE zines ADD COLUMN pen_name TEXT NOT NULL DEFAULT '';
ALTER TABLE zines ADD COLUMN jam_id TEXT;
ALTER TABLE zines ADD COLUMN b_side TEXT NOT NULL DEFAULT '';
ALTER TABLE zines ADD COLUMN edition_size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE zines ADD COLUMN errata TEXT NOT NULL DEFAULT '';
ALTER TABLE zines ADD COLUMN includes_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE zines ADD COLUMN dedication TEXT NOT NULL DEFAULT '';

ALTER TABLE listings ADD COLUMN swapped INTEGER NOT NULL DEFAULT 0;
ALTER TABLE letters ADD COLUMN postcard INTEGER NOT NULL DEFAULT 0;
ALTER TABLE letters ADD COLUMN vibe TEXT;
