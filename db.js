/**
 * GhostMail Core v2 — SQLite Database Layer
 */
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'ghostmail.db');

const db = new Database(DB_PATH);

// WAL mode para óptima concurrencia
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Esquema ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name           TEXT    DEFAULT NULL,
    recovery_email TEXT    DEFAULT NULL,
    password_hash  TEXT    NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS aliases (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,
    base_account TEXT   NOT NULL,
    provider    TEXT    NOT NULL DEFAULT 'gmail',
    mode        TEXT    NOT NULL DEFAULT 'dots',
    session_id  TEXT    NOT NULL,
    user_id     INTEGER DEFAULT NULL,
    assigned_at TEXT    NOT NULL,
    deleted_at  TEXT    DEFAULT NULL,
    status      TEXT    NOT NULL DEFAULT 'active',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
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

// Migraciones seguras para columnas agregadas dinámicamente
try {
  const aliasCols = db.prepare(`PRAGMA table_info(aliases)`).all();
  if (!aliasCols.some(col => col.name === 'user_id')) {
    db.exec(`ALTER TABLE aliases ADD COLUMN user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL;`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_aliases_user ON aliases(user_id);`);

  const userCols = db.prepare(`PRAGMA table_info(users)`).all();
  if (!userCols.some(col => col.name === 'name')) {
    db.exec(`ALTER TABLE users ADD COLUMN name TEXT DEFAULT NULL;`);
  }
  if (!userCols.some(col => col.name === 'recovery_email')) {
    db.exec(`ALTER TABLE users ADD COLUMN recovery_email TEXT DEFAULT NULL;`);
  }
} catch (e) {
  // Ignorar errores de columnas existentes
}

// ─── Autenticación (Crypto Nativo) ──────────────────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

export function createUser({ username, name, recoveryEmail, password }) {
  const cleanUsername = username.trim().toLowerCase();
  const cleanName = (name || '').trim();
  const cleanRecovery = (recoveryEmail || '').trim().toLowerCase();
  const passwordHash = hashPassword(password);

  const stmt = db.prepare(`
    INSERT INTO users (username, name, recovery_email, password_hash)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(cleanUsername, cleanName, cleanRecovery, passwordHash);
  return { id: result.lastInsertRowid, username: cleanUsername, name: cleanName, recoveryEmail: cleanRecovery };
}

export function getUserByUsername(username) {
  const clean = username.trim().toLowerCase();
  return db.prepare(`SELECT * FROM users WHERE username = ?`).get(clean);
}

export function getUserById(id) {
  return db.prepare(`SELECT id, username, name, recovery_email, created_at FROM users WHERE id = ?`).get(id);
}

// ─── Conteo de Aliases Activos (Límites: 5 invitado / 10 usuario) ─────────────
export function countActiveAliases(sessionId, userId = null) {
  if (userId) {
    const row = db.prepare(`SELECT COUNT(*) as count FROM aliases WHERE user_id = ? AND status = 'active'`).get(userId);
    return row ? row.count : 0;
  }
  const row = db.prepare(`SELECT COUNT(*) as count FROM aliases WHERE session_id = ? AND status = 'active' AND user_id IS NULL`).get(sessionId);
  return row ? row.count : 0;
}

// ─── Aliases ─────────────────────────────────────────────────────────────────
export function assignAlias({ email, baseAccount, provider, mode, sessionId, userId = null }) {
  const cleanEmail = email.toLowerCase().trim();
  const stmt = db.prepare(`
    INSERT INTO aliases (email, base_account, provider, mode, session_id, user_id, assigned_at, status)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'active')
    ON CONFLICT(email) DO UPDATE SET
      base_account = excluded.base_account,
      provider = excluded.provider,
      mode = excluded.mode,
      session_id = excluded.session_id,
      user_id = excluded.user_id,
      assigned_at = datetime('now'),
      deleted_at = NULL,
      status = 'active'
  `);
  const result = stmt.run(cleanEmail, baseAccount, provider, mode, sessionId, userId);
  return result.changes > 0;
}

export function isAliasAvailable(email) {
  const cleanEmail = email.toLowerCase().trim();
  const row = db.prepare(`SELECT id FROM aliases WHERE LOWER(email) = ? AND status = 'active'`).get(cleanEmail);
  return !row;
}

export function getAliasesForSessionOrUser(sessionId, userId = null) {
  if (userId) {
    return db.prepare(`
      SELECT id, email, base_account, provider, mode, assigned_at, status,
        (SELECT COUNT(*) FROM messages m WHERE LOWER(m.alias_email) = LOWER(aliases.email) AND m.deleted_at IS NULL) as message_count
      FROM aliases
      WHERE user_id = ? AND status = 'active'
      ORDER BY id ASC
    `).all(userId);
  }
  return db.prepare(`
    SELECT id, email, base_account, provider, mode, assigned_at, status,
      (SELECT COUNT(*) FROM messages m WHERE LOWER(m.alias_email) = LOWER(aliases.email) AND m.deleted_at IS NULL) as message_count
    FROM aliases
    WHERE session_id = ? AND status = 'active' AND user_id IS NULL
    ORDER BY id ASC
  `).all(sessionId);
}

// Vincular aliases anónimos de la sesión actual al usuario tras iniciar sesión
export function claimSessionAliasesForUser(sessionId, userId) {
  return db.prepare(`
    UPDATE aliases SET user_id = ? WHERE session_id = ? AND user_id IS NULL AND status = 'active'
  `).run(userId, sessionId);
}

export function deleteAlias(email, sessionId, userId = null) {
  const cleanEmail = email.toLowerCase().trim();
  let alias = null;
  if (userId) {
    alias = db.prepare(`SELECT id FROM aliases WHERE LOWER(email) = ? AND user_id = ? AND status = 'active'`).get(cleanEmail, userId);
  } else {
    alias = db.prepare(`SELECT id FROM aliases WHERE LOWER(email) = ? AND session_id = ? AND status = 'active'`).get(cleanEmail, sessionId);
  }
  if (!alias) return false;

  db.prepare(`UPDATE aliases SET status = 'deleted', deleted_at = datetime('now') WHERE LOWER(email) = ?`).run(cleanEmail);
  db.prepare(`UPDATE messages SET deleted_at = datetime('now') WHERE LOWER(alias_email) = ? AND deleted_at IS NULL`).run(cleanEmail);
  return true;
}

// ─── Messages ────────────────────────────────────────────────────────────────
export function saveMessage({ aliasEmail, uid, fromAddr, subject, dateReceived, html, textBody, otp, actionUrl }) {
  const cleanAlias = (aliasEmail || '').toLowerCase().trim();
  if (!cleanAlias) return null;

  if (uid) {
    const exists = db.prepare(`SELECT id FROM messages WHERE LOWER(alias_email) = ? AND uid = ? AND deleted_at IS NULL`).get(cleanAlias, uid);
    if (exists) return null;
  }

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

export function deleteMessage(id, sessionId, userId = null) {
  let msg = null;
  if (userId) {
    msg = db.prepare(`
      SELECT m.id FROM messages m
      JOIN aliases a ON LOWER(a.email) = LOWER(m.alias_email)
      WHERE m.id = ? AND a.user_id = ? AND m.deleted_at IS NULL
    `).get(id, userId);
  } else {
    msg = db.prepare(`
      SELECT m.id FROM messages m
      JOIN aliases a ON LOWER(a.email) = LOWER(m.alias_email)
      WHERE m.id = ? AND a.session_id = ? AND m.deleted_at IS NULL
    `).get(id, sessionId);
  }
  if (!msg) return false;

  db.prepare(`UPDATE messages SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  return true;
}

export function clearAllMessages() {
  db.prepare(`UPDATE messages SET deleted_at = datetime('now') WHERE deleted_at IS NULL`).run();
}

export default db;
