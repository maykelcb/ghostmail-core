/**
 * GhostMail Core v2 — SQLite Database Layer
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'ghostmail.db');

const db = new Database(DB_PATH);

// WAL mode para mejor rendimiento concurrente
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Esquema ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS aliases (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,
    base_account TEXT   NOT NULL,
    provider    TEXT    NOT NULL DEFAULT 'gmail',
    mode        TEXT    NOT NULL DEFAULT 'dots',
    session_id  TEXT    NOT NULL,
    assigned_at TEXT    NOT NULL,
    deleted_at  TEXT    DEFAULT NULL,
    status      TEXT    NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    alias_email TEXT    NOT NULL,
    uid         TEXT,
    from_addr   TEXT,
    subject     TEXT,
    date_received TEXT,
    html        TEXT,
    text_body   TEXT,
    otp         TEXT,
    action_url  TEXT,
    deleted_at  TEXT    DEFAULT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_aliases_session ON aliases(session_id);
  CREATE INDEX IF NOT EXISTS idx_aliases_status  ON aliases(status);
  CREATE INDEX IF NOT EXISTS idx_messages_alias  ON messages(alias_email);
`);

// ─── Aliases ─────────────────────────────────────────────────────────────────

export function assignAlias({ email, baseAccount, provider, mode, sessionId }) {
  const cleanEmail = email.toLowerCase().trim();
  const stmt = db.prepare(`
    INSERT INTO aliases (email, base_account, provider, mode, session_id, assigned_at, status)
    VALUES (?, ?, ?, ?, ?, datetime('now'), 'active')
    ON CONFLICT(email) DO UPDATE SET
      base_account = excluded.base_account,
      provider = excluded.provider,
      mode = excluded.mode,
      session_id = excluded.session_id,
      assigned_at = datetime('now'),
      deleted_at = NULL,
      status = 'active'
  `);
  const result = stmt.run(cleanEmail, baseAccount, provider, mode, sessionId);
  return result.changes > 0;
}

export function isAliasAvailable(email) {
  const cleanEmail = email.toLowerCase().trim();
  const row = db.prepare(`SELECT id FROM aliases WHERE LOWER(email) = ? AND status = 'active'`).get(cleanEmail);
  return !row;
}

export function getAliasesBySession(sessionId) {
  return db.prepare(`
    SELECT id, email, base_account, provider, mode, assigned_at, status,
      (SELECT COUNT(*) FROM messages m WHERE LOWER(m.alias_email) = LOWER(aliases.email) AND m.deleted_at IS NULL) as message_count
    FROM aliases
    WHERE session_id = ? AND status = 'active'
    ORDER BY id DESC
  `).all(sessionId);
}

export function getAllActiveAliasEmails() {
  return db.prepare(`SELECT email FROM aliases WHERE status = 'active'`).all().map(r => r.email.toLowerCase());
}

export function deleteAlias(email, sessionId) {
  const cleanEmail = email.toLowerCase().trim();
  const alias = db.prepare(`SELECT id FROM aliases WHERE LOWER(email) = ? AND session_id = ? AND status = 'active'`).get(cleanEmail, sessionId);
  if (!alias) return false;

  db.prepare(`UPDATE aliases SET status = 'deleted', deleted_at = datetime('now') WHERE LOWER(email) = ?`).run(cleanEmail);
  db.prepare(`UPDATE messages SET deleted_at = datetime('now') WHERE LOWER(alias_email) = ? AND deleted_at IS NULL`).run(cleanEmail);
  return true;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function saveMessage({ aliasEmail, uid, fromAddr, subject, dateReceived, html, textBody, otp, actionUrl }) {
  const cleanAlias = (aliasEmail || '').toLowerCase().trim();
  if (!cleanAlias) return null;

  // Evitar duplicados por uid + alias
  if (uid) {
    const exists = db.prepare(`SELECT id FROM messages WHERE LOWER(alias_email) = ? AND uid = ? AND deleted_at IS NULL`).get(cleanAlias, uid);
    if (exists) return null;
  }

  // Prevenir duplicados basados en remitente + asunto recibidos muy recientemente
  const recentDuplicate = db.prepare(`
    SELECT id FROM messages 
    WHERE LOWER(alias_email) = ? AND from_addr = ? AND subject = ? AND deleted_at IS NULL
    ORDER BY id DESC LIMIT 1
  `).get(cleanAlias, fromAddr ?? '', subject ?? '(Sin asunto)');
  if (recentDuplicate && !uid) return null;

  const stmt = db.prepare(`
    INSERT INTO messages (alias_email, uid, from_addr, subject, date_received, html, text_body, otp, action_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const dateStr = dateReceived ? (typeof dateReceived === 'string' ? dateReceived : new Date(dateReceived).toISOString()) : new Date().toISOString();
  const result = stmt.run(
    cleanAlias,
    uid ?? null,
    fromAddr ?? '',
    subject ?? '(Sin asunto)',
    dateStr,
    html ?? null,
    textBody ?? null,
    otp ?? null,
    actionUrl ?? null
  );
  return result.lastInsertRowid;
}

export function getMessagesByAlias(aliasEmail) {
  const cleanAlias = (aliasEmail || '').toLowerCase().trim();
  return db.prepare(`
    SELECT id, alias_email, uid, from_addr, subject, date_received, otp, action_url,
           html, text_body,
           CASE WHEN html IS NOT NULL AND html != '' THEN 1 ELSE 0 END as has_html,
           SUBSTR(COALESCE(text_body, ''), 1, 300) as preview
    FROM messages
    WHERE LOWER(alias_email) = ? AND deleted_at IS NULL
    ORDER BY id DESC
  `).all(cleanAlias);
}

export function getMessageFull(id) {
  return db.prepare(`SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL`).get(id);
}

export function deleteMessage(id, sessionId) {
  const msg = db.prepare(`
    SELECT m.id FROM messages m
    JOIN aliases a ON LOWER(a.email) = LOWER(m.alias_email)
    WHERE m.id = ? AND a.session_id = ? AND m.deleted_at IS NULL
  `).get(id, sessionId);
  if (!msg) return false;

  db.prepare(`UPDATE messages SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  return true;
}

export function clearAllMessages() {
  db.prepare(`UPDATE messages SET deleted_at = datetime('now') WHERE deleted_at IS NULL`).run();
}

export default db;
