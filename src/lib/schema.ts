// Applied automatically (idempotent) the first time the app talks to the database.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','committee','member')),
  rank          TEXT NOT NULL DEFAULT 'novice' CHECK (rank IN ('novice','helms','sr_helms','skipper')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email));

CREATE TABLE IF NOT EXISTS endorsements (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endorsement TEXT NOT NULL CHECK (endorsement IN ('hobie','laser')),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, endorsement)
);

-- One row per signed line item ("Examiner signature & date").
CREATE TABLE IF NOT EXISTS signoffs (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_key      TEXT NOT NULL,
  sheet_version TEXT NOT NULL,
  item_key      TEXT NOT NULL,
  examiner_id   INTEGER NOT NULL REFERENCES users(id),
  signed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  credit        TEXT,           -- cansail2 | cansail3 | fasttrack when credited rather than examined
  note          TEXT,
  UNIQUE (user_id, test_key, item_key)
);

-- A finished sheet ("Signature of final tester & date of completion").
CREATE TABLE IF NOT EXISTS completions (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_key          TEXT NOT NULL,
  sheet_version     TEXT NOT NULL,
  final_examiner_id INTEGER NOT NULL REFERENCES users(id),
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, test_key)
);

-- Committee-edited sheet content. No row = handbook default from src/lib/tests.ts.
CREATE TABLE IF NOT EXISTS test_sheets (
  test_key   TEXT PRIMARY KEY,
  revision   INTEGER NOT NULL,
  content    JSONB NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Every saved revision, for audit and to see what a past test was taken against.
CREATE TABLE IF NOT EXISTS test_sheet_revisions (
  test_key   TEXT NOT NULL,
  revision   INTEGER NOT NULL,
  content    JSONB NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (test_key, revision)
);

-- Failed logins, for lockout (rows older than a day are pruned).
CREATE TABLE IF NOT EXISTS login_failures (
  id    BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  ip    TEXT NOT NULL,
  at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_failures_at ON login_failures (at);
`;
