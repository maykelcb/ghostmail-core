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
  assignAlias, isAliasAvailable, getAliasesForSessionOrUser,
  countActiveAliases, claimSessionAliasesForUser,
  deleteAlias, saveMessage, getMessagesByAlias,
  getMessageFull, deleteMessage,
  createUser, getUserByUsername, getUserById, verifyPassword
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
// Si no hay clave Turnstile en .env, usamos la clave pública de prueba de Cloudflare (siempre pasa)
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

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

// Middleware de sesión anónima y usuario logueado
app.use((req, res, next) => {
  let sessionId = req.signedCookies?.gm_session;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('gm_session', sessionId, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000
    });
  }
  req.sessionId = sessionId;

  const authUserId = req.signedCookies?.gm_user_id;
  if (authUserId) {
    try {
      const user = getUserById(parseInt(authUserId, 10));
      if (user) req.user = user;
    } catch (e) {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  // Comprobar si ya fue verificado por Cloudflare en esta sesión
  req.isTurnstileVerified = req.signedCookies?.gm_cf_verified === '1' || !!req.user;

  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper Cloudflare Turnstile ─────────────────────────────────────────────
async function verifyTurnstile(token, ip) {
  // Clave de prueba de Cloudflare o sin secreto configurado
  if (!TURNSTILE_SECRET_KEY || TURNSTILE_SECRET_KEY.startsWith('1x00000000000000000000')) {
    return true;
  }
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const outcome = await result.json();
    return outcome.success === true;
  } catch (err) {
    console.error('[Turnstile] Error de validación:', err.message);
    return false;
  }
}

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

  if (msgId === null) return;

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

// ─── API: Autenticación ──────────────────────────────────────────────────────
app.get('/api/auth/me', (req, res) => {
  const maxLimit = req.user ? 10 : 5;
  const activeCount = countActiveAliases(req.sessionId, req.user?.id);
  const alreadyVerified = req.isTurnstileVerified || activeCount > 0;

  res.json({
    user: req.user,
    maxLimit,
    activeCount,
    turnstileSiteKey: TURNSTILE_SITE_KEY,
    alreadyVerified
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, name, recoveryEmail, password, confirmPassword, turnstileToken } = req.body;

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
  }
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Por favor ingresa tu nombre completo.' });
  }
  if (!recoveryEmail || !recoveryEmail.includes('@') || !recoveryEmail.includes('.')) {
    return res.status(400).json({ error: 'Por favor ingresa un correo de recuperación válido.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
  }

  // Verificación Cloudflare obligatoria para registro
  const isHuman = await verifyTurnstile(turnstileToken, req.ip);
  if (!isHuman) {
    return res.status(403).json({ error: 'Fallo en la verificación antibot de Cloudflare. Por favor completa el captcha.' });
  }

  const existing = getUserByUsername(username);
  if (existing) {
    return res.status(409).json({ error: 'Este nombre de usuario ya está registrado. Elige otro.' });
  }

  try {
    const newUser = createUser({ username, name, recoveryEmail, password });
    claimSessionAliasesForUser(req.sessionId, newUser.id);

    res.cookie('gm_user_id', String(newUser.id), {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.cookie('gm_cf_verified', '1', {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      ok: true,
      user: { id: newUser.id, username: newUser.username, name: newUser.name, recoveryEmail: newUser.recoveryEmail },
      maxLimit: 10
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Ingresa tu usuario y contraseña.' });
  }

  const user = getUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  claimSessionAliasesForUser(req.sessionId, user.id);

  res.cookie('gm_user_id', String(user.id), {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  res.cookie('gm_cf_verified', '1', {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  res.json({
    ok: true,
    user: { id: user.id, username: user.username, name: user.name, recoveryEmail: user.recovery_email },
    maxLimit: 10
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('gm_user_id');
  res.json({ ok: true });
});

// ─── API: Crear alias ─────────────────────────────────────────────────────────
app.post('/api/aliases', async (req, res) => {
  const mode = req.body.mode || 'dots';
  const turnstileToken = req.body.turnstileToken;

  const maxLimit = req.user ? 10 : 5;
  const currentCount = countActiveAliases(req.sessionId, req.user?.id);

  if (currentCount >= maxLimit) {
    const errorMsg = req.user
      ? `Has alcanzado el límite máximo de ${maxLimit} correos simultáneos. Elimina alguno de tu lista para crear uno nuevo.`
      : `Límite alcanzado (máximo 5 correos para invitados). Elimina uno de tu lista o inicia sesión para tener hasta 10 correos simultáneos.`;
    return res.status(403).json({
      error: errorMsg,
      limitReached: true,
      maxLimit,
      isGuest: !req.user
    });
  }

  // Cloudflare Turnstile: solo se exige la primera vez si no está verificado en la sesión
  const needsVerification = !req.isTurnstileVerified && currentCount === 0;
  if (needsVerification) {
    const isHuman = await verifyTurnstile(turnstileToken, req.ip);
    if (!isHuman) {
      return res.status(403).json({ error: 'Por favor completa la verificación de Cloudflare para continuar.' });
    }
    // Marcar verificado en la cookie de sesión
    res.cookie('gm_cf_verified', '1', {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
  }

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
    sessionId:   req.sessionId,
    userId:      req.user?.id || null
  });

  res.json({
    email:       alias.email,
    baseAccount: alias.baseAccount,
    mode,
    provider,
    currentCount: currentCount + 1,
    maxLimit,
    verified: true
  });
});

// ─── API: Historial de aliases ────────────────────────────────────────────────
app.get('/api/aliases', (req, res) => {
  const aliases = getAliasesForSessionOrUser(req.sessionId, req.user?.id);
  res.json(aliases);
});

// ─── API: Eliminar alias ──────────────────────────────────────────────────────
app.delete('/api/aliases/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const ok = deleteAlias(email, req.sessionId, req.user?.id);
  if (!ok) return res.status(404).json({ error: 'Alias no encontrado o no tienes permiso para eliminarlo' });
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
  const ok = deleteMessage(parseInt(req.params.id), req.sessionId, req.user?.id);
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
