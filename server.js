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
import nodemailer from 'nodemailer';

import { generateAlias } from './aliasGenerator.js';
import { ImapWorkerPool } from './imapWorker.js';
import {
  assignAlias, isAliasAvailable, getAliasesForSessionOrUser,
  countActiveAliases, claimSessionAliasesForUser,
  deleteAlias, saveMessage, getMessagesByAlias,
  getMessageFull, deleteMessage,
  createUser, getUserByUsernameOrEmail, getUserByEmail, getUserById, verifyPassword,
  setPasswordResetCode, verifyPasswordResetCode, resetPasswordWithCode
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
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

// ─── Mailer para Recuperación de Contraseña ──────────────────────────────────
let mailer = null;
if (accounts.length > 0) {
  mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: accounts[0].user,
      pass: accounts[0].pass || accounts[0].password
    }
  });
}

async function sendPasswordResetEmail(toEmail, code) {
  if (!mailer) {
    console.log(`[MAILER MOCK] Código de recuperación para ${toEmail}: ${code}`);
    return true;
  }
  try {
    await mailer.sendMail({
      from: `"GhostMail Security" <${accounts[0].user}>`,
      to: toEmail,
      subject: `Código de recuperación: ${code} - GhostMail Core`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #111b21; color: #e9edef; border-radius: 12px; border: 1px solid #222d34;">
          <h2 style="color: #00a884; margin-top: 0;">GhostMail Core</h2>
          <p style="font-size: 15px; color: #8696a0;">Has solicitado restablecer tu contraseña. Usa el siguiente código de 6 dígitos:</p>
          <div style="background: #202c33; border: 2px dashed #00a884; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #ffffff;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #667781;">Este código vencerá en 15 minutos. Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        </div>
      `
    });
    return true;
  } catch (err) {
    console.error('[Mailer] Error al enviar correo de recuperación:', err.message);
    // En desarrollo, no bloqueamos la experiencia
    return true;
  }
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

  req.isTurnstileVerified = req.signedCookies?.gm_cf_verified === '1' || !!req.user;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper Cloudflare Turnstile ─────────────────────────────────────────────
async function verifyTurnstile(token, ip) {
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

// ─── Helpers de Validación de Seguridad y Correo ─────────────────────────────
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
  'throwawaymail.com', 'sharklasers.com', 'dispostable.com', 'getnada.com', 'mohmal.com',
  'crazymailing.com', 'fakeinbox.com', 'mytemp.email', 'temp-mail.org', 'fakemailgenerator.com',
  'emailondeck.com', 'generator.email', 'inboxkitten.com', 'burnermail.io', 'dropmail.me',
  'tempail.com', 'trashmail.com', 'trashmail.net', 'maildrop.cc', 'grr.la', 'inboxalias.com',
  'armyspy.com', 'cuvox.de', 'dayrep.com', 'fleckens.hu', 'gustr.com', 'jourrapide.com',
  'rhyta.com', 'superrito.com', 'teleworm.us', 'tinypm.com', 'chacuo.net', 'binkmail.com',
  'bobmail.info', 'chammy.info', 'devnullmail.com', 'letthemeatspam.com', 'mailinater.com',
  'mailinator2.com', 'notmailinator.com', 'reallymymail.com', 'reconmail.com', 'safetymail.info',
  'sendspamhere.com', 'sogetthis.com', 'spamavert.com', 'spamfree24.org', 'suremail.info',
  'thisisnotmyrealemail.com', 'zippymail.info', '014.fr', 'emailfake.com', 'mohmal.im', 'mohmal.in'
]);

function isDisposableEmail(email) {
  if (!email || !email.includes('@')) return false;
  const parts = email.toLowerCase().split('@');
  const domain = parts[1]?.trim();
  if (!domain) return false;

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;

  const suspiciousKeywords = ['tempmail', '10minute', 'guerrilla', 'throwaway', 'dispostable', 'fakemail', 'burnermail', 'trashmail', 'mytemp', 'sharklaser', 'yopmail', 'mailinator'];
  if (suspiciousKeywords.some(keyword => domain.includes(keyword))) {
    return true;
  }

  for (const acc of accounts) {
    const accDomain = acc.user.split('@')[1]?.toLowerCase();
    if (accDomain && domain === accDomain) {
      const baseUser = acc.user.split('@')[0].toLowerCase().replace(/\./g, '');
      const testUser = parts[0].toLowerCase().replace(/\./g, '').split('+')[0];
      if (testUser === baseUser) return true;
    }
  }

  return false;
}

function isStrongPassword(pass) {
  if (!pass || pass.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass);
  return hasUpper && hasNumber && hasSymbol;
}

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

// Registro con validaciones estrictas de seguridad (Punto 2, 6, 8)
app.post('/api/auth/register', async (req, res) => {
  const { name, email, username, password, confirmPassword, turnstileToken } = req.body;

  // 1. Validación de Nombre (solo letras y espacios, sin números ni símbolos)
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,50}$/;
  if (!name || !nameRegex.test(name.trim())) {
    return res.status(400).json({
      error: 'El nombre solo debe contener letras y espacios (sin números ni símbolos).',
      code: 'NAME_INVALID'
    });
  }

  // 2. Validación de Correo (prohibir desechables / temporales)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({
      error: 'Por favor ingresa un correo electrónico válido.',
      code: 'EMAIL_INVALID'
    });
  }
  if (isDisposableEmail(email.trim())) {
    return res.status(400).json({
      error: 'No se permiten correos temporales o desechables. Por favor usa un proveedor permanente (Gmail, Outlook, Yahoo, iCloud, etc.).',
      code: 'DISPOSABLE_EMAIL'
    });
  }

  // 3. Validación de Usuario (inicia con letra, 3-20 caracteres, no solo números)
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
  if (!username || !usernameRegex.test(username.trim())) {
    return res.status(400).json({
      error: 'El usuario debe comenzar con una letra y tener entre 3 y 20 caracteres (solo letras, números y _). No puede ser solo números ni contener símbolos extraños.',
      code: 'USERNAME_INVALID'
    });
  }

  // 4. Validación de Contraseña Segura (mínimo 8 caracteres, mayúscula, número y símbolo)
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 8 caracteres e incluir al menos una mayúscula, un número y un símbolo especial (!@#$%...).',
      code: 'WEAK_PASSWORD'
    });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({
      error: 'Las contraseñas no coinciden.',
      code: 'PASSWORD_MISMATCH'
    });
  }

  // 5. Cloudflare Turnstile
  const isHuman = await verifyTurnstile(turnstileToken, req.ip);
  if (!isHuman) {
    return res.status(403).json({
      error: 'Fallo en la verificación antibot de Cloudflare. Por favor completa el captcha.',
      code: 'CF_FAILED'
    });
  }

  // Comprobar si ya existe usuario o correo
  const existingUser = getUserByUsernameOrEmail(username);
  if (existingUser) {
    return res.status(409).json({
      error: 'El nombre de usuario ya está en uso. Elige otro.',
      code: 'USER_EXISTS'
    });
  }
  const existingEmail = getUserByEmail(email);
  if (existingEmail) {
    return res.status(409).json({
      error: 'Este correo electrónico ya está registrado. Intenta iniciar sesión o recuperar contraseña.',
      code: 'EMAIL_EXISTS'
    });
  }

  try {
    const newUser = createUser({ email: email.trim(), username: username.trim(), name: name.trim(), password });
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
      user: { id: newUser.id, email: newUser.email, username: newUser.username, name: newUser.name },
      maxLimit: 10
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario: ' + err.message, code: 'SERVER_ERROR' });
  }
});

// Login por Correo Electrónico con control estricto de límite (Punto 6)
app.post('/api/auth/login', async (req, res) => {
  const { email, password, forceDiscardGuest } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Ingresa tu correo y contraseña.', code: 'MISSING_FIELDS' });
  }

  const user = getUserByUsernameOrEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.', code: 'INVALID_CREDENTIALS' });
  }

  // Control de migración de límite de 10 correos
  const userCount = countActiveAliases(null, user.id);
  const sessionCount = countActiveAliases(req.sessionId, null);

  // Si tiene correos de invitado y al unirlos superaría 10
  if (sessionCount > 0 && (userCount + sessionCount > 10) && !forceDiscardGuest) {
    return res.status(409).json({
      conflict: true,
      code: 'LIMIT_CONFLICT',
      userCount,
      sessionCount,
      message: userCount >= 10
        ? `Tu cuenta ya tiene el límite máximo de ${userCount} correos activos. Si continúas, los ${sessionCount} correo(s) temporales creados en esta sesión se perderán y solo verás los de tu cuenta.`
        : `Al juntar los ${sessionCount} correos de esta sesión con los ${userCount} de tu cuenta se superaría el límite de 10. Si continúas, solo se conservarán los que quepan hasta llegar a 10.`
    });
  }

  // Migrar correos respetando el tope de 10
  claimSessionAliasesForUser(req.sessionId, user.id, forceDiscardGuest === true);

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
    user: { id: user.id, email: user.email, username: user.username, name: user.name },
    maxLimit: 10
  });
});

// Olvidé mi contraseña: Enviar código OTP de 6 dígitos al correo registrado
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Ingresa tu correo electrónico registrado.', code: 'MISSING_EMAIL' });

  const user = getUserByEmail(email.trim());
  if (!user) {
    return res.status(404).json({ error: 'No existe ninguna cuenta registrada con este correo electrónico.', code: 'USER_NOT_FOUND' });
  }

  // Generar código de 6 dígitos
  const code = String(Math.floor(100000 + Math.random() * 900000));
  setPasswordResetCode(user.email, code, 15);

  // Enviar correo real con nodemailer
  await sendPasswordResetEmail(user.email, code);

  res.json({
    ok: true,
    code: 'CODE_SENT',
    message: `Se ha enviado un código de 6 dígitos a ${user.email}. Por favor revisa tu bandeja de entrada o spam.`
  });
});

// Restablecer contraseña con código
app.post('/api/auth/reset-password', (req, res) => {
  const { email, code, newPassword, confirmNewPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Por favor completa todos los campos requeridos.', code: 'MISSING_FIELDS' });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      error: 'La nueva contraseña debe tener al menos 8 caracteres e incluir al menos una mayúscula, un número y un símbolo especial (!@#$%...).',
      code: 'WEAK_PASSWORD'
    });
  }
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'Las nuevas contraseñas no coinciden.', code: 'PASSWORD_MISMATCH' });
  }

  const ok = resetPasswordWithCode(email.trim(), code.trim(), newPassword);
  if (!ok) {
    return res.status(400).json({ error: 'El código de verificación es inválido o ha caducado.', code: 'INVALID_CODE' });
  }

  res.json({
    ok: true,
    code: 'PASSWORD_RESET_SUCCESS',
    message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.'
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

  // Cloudflare solo se exige para el primer correo si no está verificado
  const needsVerification = !req.isTurnstileVerified && currentCount === 0;
  if (needsVerification) {
    const isHuman = await verifyTurnstile(turnstileToken, req.ip);
    if (!isHuman) {
      return res.status(403).json({ error: 'Por favor completa la verificación de Cloudflare para continuar.' });
    }
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
