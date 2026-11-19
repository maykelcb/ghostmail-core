/**
 * GhostMail Core v2 — Express + Socket.io Server
 */
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

import { generateAlias } from './aliasGenerator.js';
import { ImapWorkerPool } from './imapWorker.js';
import {
  assignAlias, isAliasAvailable, getAliasesBySession,
  deleteAlias, saveMessage, getMessagesByAlias,
  getMessageFull, deleteMessage
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// ─── Configuración de cuentas ────────────────────────────────────────────────
let accounts = [];
try {
  accounts = JSON.parse(process.env.GMAIL_ACCOUNTS || '[]');
} catch (e) {
  console.error('[CONFIG] Error al parsear GMAIL_ACCOUNTS en .env:', e.message);
}
if (!accounts.length) {
  console.error('[CONFIG] No hay cuentas configuradas en GMAIL_ACCOUNTS');
  process.exit(1);
}

// ─── Express + Socket.io ─────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, { cors: { origin: '*' } });

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'ghostmail-secret-session-key'));

// Middleware de sesión universal
app.use((req, res, next) => {
  let sessionId = req.signedCookies?.gm_session;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('gm_session', sessionId, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000 // 1 año
    });
  }
  req.sessionId = sessionId;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── IMAP Pool ───────────────────────────────────────────────────────────────
const imapPool = new ImapWorkerPool(accounts);

imapPool.on('message', (msg) => {
  const cleanTo = (msg.to || '').toLowerCase().trim();
  const msgId = saveMessage({
    aliasEmail:   cleanTo,
    uid:          msg.uid ? String(msg.uid) : msg.id,
    fromAddr:     msg.from,
    subject:      msg.subject,
    dateReceived: msg.date,
    html:         msg.html,
    textBody:     msg.text,
    otp:          msg.otp,
    actionUrl:    msg.actionUrl
  });

  if (msgId === null) return; // Duplicado evitado

  const payload = {
    id:          msgId,
    alias_email: cleanTo,
    from_addr:   msg.from,
    subject:     msg.subject,
    date_received: msg.date ? new Date(msg.date).toISOString() : new Date().toISOString(),
    otp:         msg.otp,
    action_url:  msg.actionUrl,
    has_html:    msg.html ? 1 : 0,
    html:        msg.html,
    text_body:   msg.text,
    preview:     (msg.text || '').substring(0, 300)
  };

  io.emit('new_message', payload);
});

// ─── API: Estado ─────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const totalCombos = accounts.reduce((sum, acc) => {
    const user = acc.user.split('@')[0];
    return sum + Math.pow(2, Math.max(0, user.length - 1)) * 2;
  }, 0);
  res.json({
    activeAccounts:    accounts.length,
    totalCombinations: totalCombos,
    uptime:            process.uptime()
  });
});

// ─── API: Crear alias ─────────────────────────────────────────────────────────
app.post('/api/aliases', (req, res) => {
  const mode = req.body.mode || 'dots'; // dots | googlemail | plus | outlook

  let attempts = 0;
  let alias = null;

  try {
    while (attempts < 50) {
      const candidate = generateAlias(accounts, mode);
      if (isAliasAvailable(candidate.email)) {
        alias = candidate;
        break;
      }
      attempts++;
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (!alias) {
    return res.status(503).json({ error: 'No se pudo generar un alias disponible en este momento. Intenta de nuevo.' });
  }

  const provider = alias.email.includes('@googlemail') 
    ? 'googlemail' 
    : (alias.email.includes('@outlook') || alias.email.includes('@hotmail')) 
      ? 'outlook' 
      : 'gmail';

  assignAlias({
    email:       alias.email,
    baseAccount: alias.baseAccount,
    provider,
    mode,
    sessionId:   req.sessionId
  });

  res.json({
    email:       alias.email,
    baseAccount: alias.baseAccount,
    mode,
    provider
  });
});

// ─── API: Historial de aliases de la sesión ───────────────────────────────────
app.get('/api/aliases', (req, res) => {
  const aliases = getAliasesBySession(req.sessionId);
  res.json(aliases);
});

// ─── API: Eliminar alias ──────────────────────────────────────────────────────
app.delete('/api/aliases/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const ok = deleteAlias(email, req.sessionId);
  if (!ok) return res.status(404).json({ error: 'Alias no encontrado o no pertenece a tu sesión' });
  io.emit('alias_deleted', { email });
  res.json({ ok: true });
});

// ─── API: Mensajes de un alias ────────────────────────────────────────────────
app.get('/api/messages/:aliasEmail', (req, res) => {
  const aliasEmail = decodeURIComponent(req.params.aliasEmail);
  const messages = getMessagesByAlias(aliasEmail);
  res.json(messages);
});

// ─── API: Mensaje completo (HTML) ─────────────────────────────────────────────
app.get('/api/messages/:id/full', (req, res) => {
  const msg = getMessageFull(parseInt(req.params.id));
  if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });
  res.json(msg);
});

// ─── API: Eliminar mensaje individual ─────────────────────────────────────────
app.delete('/api/messages/:id', (req, res) => {
  const ok = deleteMessage(parseInt(req.params.id), req.sessionId);
  if (!ok) return res.status(404).json({ error: 'Mensaje no encontrado o no tienes permiso para eliminarlo' });
  res.json({ ok: true });
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n${'='.repeat(55)}`);
  console.log(` GHOSTMAIL CORE v2 — SERVIDOR INICIADO EN PUERTO ${PORT}`);
  console.log(` Accede localmente en: http://localhost:${PORT}`);
  console.log(`${'='.repeat(55)}`);
  imapPool.start();
});
