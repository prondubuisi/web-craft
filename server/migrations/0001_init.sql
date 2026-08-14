CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  remix_points INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'human',
  created_at INTEGER NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  scene TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS zines (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  vibe TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  drops_at INTEGER,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  remixes INTEGER NOT NULL DEFAULT 0,
  remixed_from TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  share_key TEXT,
  pass_hash TEXT,
  pass_salt TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  finish TEXT NOT NULL DEFAULT 'clean',
  chain_key TEXT,
  chain_open INTEGER NOT NULL DEFAULT 0,
  series TEXT NOT NULL DEFAULT '',
  issue_no INTEGER,
  pen_name TEXT NOT NULL DEFAULT '',
  jam_id TEXT,
  b_side TEXT NOT NULL DEFAULT '',
  edition_size INTEGER NOT NULL DEFAULT 0,
  errata TEXT NOT NULL DEFAULT '',
  includes_json TEXT NOT NULL DEFAULT '[]',
  dedication TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (zine_id) REFERENCES zines(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS poll_votes (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  option_idx INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id, block_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users(id),
  FOREIGN KEY (followee_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  zine_id TEXT,
  body TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  zine_id TEXT,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  swapped INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS guestbook (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES users(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS shelves (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS page_stats (
  zine_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  dwell_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (zine_id, page),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS bags (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (zine_id, user_id),
  FOREIGN KEY (zine_id) REFERENCES zines(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  postcard INTEGER NOT NULL DEFAULT 0,
  vibe TEXT,
  FOREIGN KEY (from_id) REFERENCES users(id),
  FOREIGN KEY (to_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS claims (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS series_watches (
  user_id TEXT NOT NULL,
  series TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, series),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS table_sits (
  user_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, table_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS loans (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS cork_pins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  rotation REAL NOT NULL DEFAULT 0,
  src TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS jams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'any',
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS nominations (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS fest_tables (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scene TEXT NOT NULL DEFAULT '',
  blurb TEXT NOT NULL DEFAULT '',
  zine_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS stamps (
  user_id TEXT NOT NULL,
  zine_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, zine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (zine_id) REFERENCES zines(id)
);
CREATE TABLE IF NOT EXISTS margins (
  id TEXT PRIMARY KEY,
  zine_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (zine_id) REFERENCES zines(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
