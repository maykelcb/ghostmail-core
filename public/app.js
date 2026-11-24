/**
 * GhostMail Core v2 — Frontend Controller & WebSocket Client
 */

// ─── Diccionario de Traducciones (ES / EN) ──────────────────────────────────
const translations = {
  es: {
    accent_color: "Color de acento",
    login: "Ingresar",
    logout: "Cerrar sesión",
    history: "Historial",
    create_new: "Crear nuevo correo",
    no_aliases: "Sin correos activos",
    welcome_title: "Bienvenido a GhostMail",
    welcome_desc: "Genera tu correo temporal al instante.",
    create_first: "Crear mi primer correo",
    delete: "Eliminar",
    copy: "COPIAR",
    copied: "¡COPIADO!",
    live: "En vivo",
    inbox: "Bandeja de entrada",
    waiting_emails: "Esperando correos...",
    waiting_desc: "Usa este correo para registrarte en cualquier plataforma",
    create_modal_title: "Crear correo temporal",
    create_modal_sub: "Selecciona el proveedor para tu alias aleatorio",
    btn_generate: "Generar correo",
    tab_login: "Iniciar Sesión",
    tab_register: "Registrarse",
    auth_perk: "Accede a 10 correos simultáneos y guarda tu historial",
    email_label: "Correo electrónico",
    name_label: "Nombre",
    username_label: "Usuario (inicia con letra)",
    password: "Contraseña",
    confirm_password: "Confirmar contraseña",
    password_hint: "Mínimo 8 caracteres, al menos una mayúscula, un número y un símbolo.",
    email_placeholder: "ej. usuario@gmail.com",
    name_placeholder: "ej. Maykel Bernaola",
    user_placeholder: "ej. maykel1234",
    confirm_title: "¿Eliminar?",
    confirm_desc: "Esta acción no se puede deshacer.",
    cancel: "Cancelar",
    confirm_delete: "Eliminar",
    limit_guest: "Límite: 5 correos simultáneos para invitados (10 para usuarios logueados).",
    limit_user: "Límite: 10 correos simultáneos para tu cuenta.",
    full_email_open: "Ver correo completo",
    full_email_close: "Ocultar correo completo",
    detected_code: "CÓDIGO DETECTADO:",
    confirm_action_link: "Confirmar / Abrir Enlace",
    delete_msg_prompt: "¿Eliminar este mensaje? Esta acción no se puede deshacer y se borrará permanentemente.",
    delete_alias_prompt: "Se borrará este correo temporal y todos sus mensajes recibidos. No se podrá recuperar.",
    limit_reached_guest: "Has alcanzado el límite de 5 correos simultáneos. Elimina alguno o inicia sesión para tener hasta 10.",
    limit_reached_user: "Has alcanzado el límite máximo de 10 correos simultáneos. Elimina alguno para crear uno nuevo.",
    my_emails: "Mis correos generados",
    add_another: "Agregar",
    active_emails_title: "Correos activos",
    history_inbox: "Historial de mensajes",
    create_account: "Crear cuenta",
    sound_on: "Sonido activado",
    sound_off: "Sonido silenciado",
    forgot_password: "¿Olvidaste tu contraseña?",
    recovery_title: "Recuperar Cuenta",
    recovery_desc: "Ingresa tu correo oficial registrado para enviarte un código de verificación de 6 dígitos.",
    send_code: "Enviar código",
    back_to_login: "Volver a iniciar sesión",
    enter_code_title: "Ingresa el código",
    enter_code_desc: "Hemos enviado un código a tu correo. Ingrésalo junto con tu nueva contraseña.",
    otp_code_label: "Código de 6 dígitos",
    new_password: "Nueva contraseña",
    change_password: "Restablecer contraseña",
    change_email: "Cambiar correo",
    conflict_title: "Límite de correos alcanzado",
    proceed_login: "Continuar e iniciar sesión",
    logout_prompt: "¿Deseas cerrar la sesión de <b>{name}</b>?",
    // Errores y Notificaciones
    err_user_exists: "El nombre de usuario ya está en uso. Elige otro.",
    err_email_exists: "Este correo electrónico ya está registrado. Intenta iniciar sesión o recuperar contraseña.",
    err_invalid_credentials: "Correo o contraseña incorrectos.",
    err_disposable_email: "No se permiten correos temporales o desechables. Por favor usa un proveedor permanente (Gmail, Outlook, Yahoo, etc.).",
    err_weak_password: "La contraseña debe tener al menos 8 caracteres e incluir al menos una mayúscula, un número y un símbolo especial (!@#$%...).",
    err_password_mismatch: "Las contraseñas no coinciden.",
    err_name_invalid: "El nombre solo debe contener letras y espacios (sin números ni símbolos).",
    err_email_invalid: "Por favor ingresa un correo electrónico válido.",
    err_username_invalid: "El usuario debe comenzar con una letra y tener entre 3 y 20 caracteres (solo letras, números y _). No puede ser solo números.",
    err_cf_failed: "Fallo en la verificación antibot de Cloudflare. Por favor completa el captcha.",
    err_user_not_found: "No existe ninguna cuenta registrada con este correo electrónico.",
    err_invalid_code: "El código de verificación es inválido o ha caducado.",
    err_missing_fields: "Por favor completa todos los campos requeridos.",
    err_missing_email: "Ingresa tu correo registrado.",
    err_connection: "Error de conexión con el servidor.",
    msg_code_sent: "Código de verificación enviado. Revisa tu bandeja de entrada o spam.",
    msg_password_reset_success: "¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.",
    msg_welcome_user: "Bienvenido",
    msg_account_created: "Cuenta creada exitosamente"
  },
  en: {
    accent_color: "Accent color",
    login: "Log In",
    logout: "Log Out",
    history: "History",
    create_new: "Create new email",
    no_aliases: "No active emails",
    welcome_title: "Welcome to GhostMail",
    welcome_desc: "Generate your disposable email instantly.",
    create_first: "Create my first email",
    delete: "Delete",
    copy: "COPY",
    copied: "COPIED!",
    live: "Live",
    inbox: "Inbox",
    waiting_emails: "Waiting for emails...",
    waiting_desc: "Use this email to sign up on any platform",
    create_modal_title: "Create disposable email",
    create_modal_sub: "Select provider for your random alias",
    btn_generate: "Generate email",
    tab_login: "Log In",
    tab_register: "Sign Up",
    auth_perk: "Get up to 10 simultaneous emails and save your history",
    email_label: "Email address",
    name_label: "Name",
    username_label: "Username (starts with letter)",
    password: "Password",
    confirm_password: "Confirm password",
    password_hint: "Minimum 8 characters, at least one uppercase letter, one number, and one symbol.",
    email_placeholder: "e.g. user@gmail.com",
    name_placeholder: "e.g. John Doe",
    user_placeholder: "e.g. john1234",
    confirm_title: "Delete?",
    confirm_desc: "This action cannot be undone.",
    cancel: "Cancel",
    confirm_delete: "Delete",
    limit_guest: "Limit: 5 simultaneous emails for guests (10 for registered users).",
    limit_user: "Limit: 10 simultaneous emails for your account.",
    full_email_open: "View full email",
    full_email_close: "Hide full email",
    detected_code: "DETECTED CODE:",
    confirm_action_link: "Confirm / Open Link",
    delete_msg_prompt: "Delete this message? This action cannot be undone and will be permanently deleted.",
    delete_alias_prompt: "This disposable email and all received messages will be permanently deleted.",
    limit_reached_guest: "You have reached the 5 simultaneous emails limit. Delete one or log in to get up to 10.",
    limit_reached_user: "You have reached the 10 simultaneous emails limit. Delete one to create a new one.",
    my_emails: "My generated emails",
    add_another: "Add another",
    active_emails_title: "Active emails",
    history_inbox: "Message history",
    create_account: "Create account",
    sound_on: "Sound enabled",
    sound_off: "Sound muted",
    forgot_password: "Forgot your password?",
    recovery_title: "Recover Account",
    recovery_desc: "Enter your registered email to receive a 6-digit verification code.",
    send_code: "Send code",
    back_to_login: "Back to log in",
    enter_code_title: "Enter the code",
    enter_code_desc: "We have sent a code to your email. Enter it with your new password.",
    otp_code_label: "6-digit code",
    new_password: "New password",
    change_password: "Reset password",
    change_email: "Change email",
    conflict_title: "Email limit reached",
    proceed_login: "Continue and log in",
    logout_prompt: "Do you want to log out of <b>{name}</b>?",
    // Errors and Notifications
    err_user_exists: "Username already in use. Please choose another.",
    err_email_exists: "This email address is already registered. Try logging in or resetting password.",
    err_invalid_credentials: "Incorrect email or password.",
    err_disposable_email: "Temporary or disposable emails are not allowed. Please use a permanent email provider (Gmail, Outlook, Yahoo, etc.).",
    err_weak_password: "Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special symbol (!@#$%...).",
    err_password_mismatch: "Passwords do not match.",
    err_name_invalid: "Name must only contain letters and spaces (no numbers or symbols).",
    err_email_invalid: "Please enter a valid email address.",
    err_username_invalid: "Username must start with a letter and have 3-20 characters (letters, numbers and _ only). Cannot be only numbers.",
    err_cf_failed: "Cloudflare bot verification failed. Please complete the captcha.",
    err_user_not_found: "No account exists with this email address.",
    err_invalid_code: "The verification code is invalid or has expired.",
    err_missing_fields: "Please complete all required fields.",
    err_missing_email: "Enter your registered email.",
    err_connection: "Connection error with the server.",
    msg_code_sent: "Verification code sent. Check your inbox or spam folder.",
    msg_password_reset_success: "Password reset successfully! You can now log in with your new password.",
    msg_welcome_user: "Welcome back",
    msg_account_created: "Account created successfully"
  }
};

let currentLang = localStorage.getItem('ghost_lang') || 'es';

function t(key) {
  return translations[currentLang]?.[key] || translations['es']?.[key] || key;
}

function getTranslatedError(data) {
  if (!data) return t('err_connection');
  if (data.code && translations[currentLang]?.[`err_${data.code.toLowerCase()}`]) {
    return translations[currentLang][`err_${data.code.toLowerCase()}`];
  }
  const errStr = (data.error || '').toLowerCase();
  if (errStr.includes('nombre de usuario ya está en uso') || errStr.includes('username already')) return t('err_user_exists');
  if (errStr.includes('ya está registrado') || errStr.includes('already registered')) return t('err_email_exists');
  if (errStr.includes('incorrectos') || errStr.includes('incorrect')) return t('err_invalid_credentials');
  if (errStr.includes('desechable') || errStr.includes('temporal') || errStr.includes('disposable')) return t('err_disposable_email');
  if (errStr.includes('al menos') && (errStr.includes('caracteres') || errStr.includes('characters'))) return t('err_weak_password');
  if (errStr.includes('no coinciden') || errStr.includes('dont match') || errStr.includes('not match')) return t('err_password_mismatch');
  if (errStr.includes('solo debe contener letras') || errStr.includes('only contain letters')) return t('err_name_invalid');
  if (errStr.includes('no existe ninguna cuenta') || errStr.includes('no account exists')) return t('err_user_not_found');
  if (errStr.includes('código de verificación es inválido') || errStr.includes('invalid or has expired')) return t('err_invalid_code');
  if (errStr.includes('cloudflare')) return t('err_cf_failed');
  return data.error || t('err_connection');
}

function isFrontendDisposableEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.toLowerCase().split('@')[1]?.trim();
  if (!domain) return false;
  const blockedList = [
    'mailinator.com', 'yopmail.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
    'throwawaymail.com', 'sharklasers.com', 'dispostable.com', 'getnada.com', 'mohmal.com',
    'crazymailing.com', 'fakeinbox.com', 'mytemp.email', 'temp-mail.org', 'fakemailgenerator.com',
    'emailondeck.com', 'generator.email', 'inboxkitten.com', 'burnermail.io', 'dropmail.me',
    'tempail.com', 'trashmail.com', 'trashmail.net', 'maildrop.cc', 'grr.la', 'inboxalias.com'
  ];
  if (blockedList.includes(domain)) return true;
  const suspicious = ['tempmail', '10minute', 'guerrilla', 'throwaway', 'dispostable', 'fakemail', 'burnermail', 'trashmail', 'mytemp', 'sharklaser', 'yopmail', 'mailinator'];
  return suspicious.some(k => domain.includes(k));
}

function isFrontendStrongPassword(pass) {
  if (!pass || pass.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass);
  return hasUpper && hasNumber && hasSymbol;
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('ghost_lang', lang);
  document.getElementById('langLabel').textContent = lang === 'es' ? 'EN' : 'ES';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang]?.[key]) {
      el.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (translations[lang]?.[key]) {
      el.setAttribute('placeholder', translations[lang][key]);
    }
  });

  updateLimitInfoText();
  updateAuthUI();
}

// ─── Web Audio API Doble Chime Cristalino ────────────────────────────────────
class GhostAudio {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('ghost_audio') !== 'false';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playDing() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;

      // Primer tono (E5 a A5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.38);

      // Segundo tono campanita (C6 a E6)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22);

      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn('[Audio] Error:', e);
    }
  }
}

const audio = new GhostAudio();

// ─── State ───────────────────────────────────────────
let aliases = [];
let currentAlias = null;
let messages = [];
let socket = null;
let pendingConfirmCallback = null;

let currentUser = null;
let maxLimit = 5;
let turnstileSiteKey = '1x00000000000000000000AA';
let alreadyVerified = false;
let turnstileAuthWidgetId = null;
let turnstileCreateWidgetId = null;

let resetPendingEmail = '';
let pendingConflictLogin = null;

// DOM Elements
const welcomeScreen       = document.getElementById('welcomeScreen');
const aliasView           = document.getElementById('aliasView');
const aliasList           = document.getElementById('aliasList');
const aliasCountBadge     = document.getElementById('aliasCountBadge');
const aliasEmailDisplay   = document.getElementById('aliasEmailDisplay');
const aliasProviderBadge  = document.getElementById('aliasProviderBadge');
const btnCopyAlias        = document.getElementById('btnCopyAlias');
const copyBtnText         = document.getElementById('copyBtnText');
const btnDeleteAlias      = document.getElementById('btnDeleteAlias');
const messagesFeed        = document.getElementById('messagesFeed');
const emptyState          = document.getElementById('emptyState');
const messageCountBadge   = document.getElementById('messageCountBadge');

const createdEmailsPills  = document.getElementById('createdEmailsPills');
const btnMiniAddAlias     = document.getElementById('btnMiniAddAlias');

// Modals
const createModal         = document.getElementById('createModal');
const modalClose          = document.getElementById('modalClose');
const btnCreateBig        = document.getElementById('btnCreateBig');
const btnCreateNew        = document.getElementById('btnCreateNew');
const btnGenerateModal    = document.getElementById('btnGenerateModal');
const modalLimitText      = document.getElementById('modalLimitText');
const turnstileCreateContainer = document.getElementById('turnstileCreateContainer');

const authModal           = document.getElementById('authModal');
const authModalClose      = document.getElementById('authModalClose');
const authBtn             = document.getElementById('authBtn');
const authBtnText         = document.getElementById('authBtnText');
const authTabsNav         = document.getElementById('authTabsNav');
const tabLoginBtn         = document.getElementById('tabLoginBtn');
const tabRegisterBtn      = document.getElementById('tabRegisterBtn');

const loginForm           = document.getElementById('loginForm');
const loginEmail          = document.getElementById('loginEmail');
const loginPassword       = document.getElementById('loginPassword');
const loginSubmitBtn      = document.getElementById('loginSubmitBtn');
const btnGoToForgotPassword = document.getElementById('btnGoToForgotPassword');

const registerForm        = document.getElementById('registerForm');
const regName             = document.getElementById('regName');
const regEmail            = document.getElementById('regEmail');
const regUsername         = document.getElementById('regUsername');
const regPassword         = document.getElementById('regPassword');
const regConfirmPassword  = document.getElementById('regConfirmPassword');
const regSubmitBtn        = document.getElementById('regSubmitBtn');

const forgotFormStep1     = document.getElementById('forgotFormStep1');
const forgotEmail         = document.getElementById('forgotEmail');
const btnSendResetCode    = document.getElementById('btnSendResetCode');
const btnBackToLoginFromForgot = document.getElementById('btnBackToLoginFromForgot');

const forgotFormStep2     = document.getElementById('forgotFormStep2');
const resetOtpCode        = document.getElementById('resetOtpCode');
const resetNewPassword    = document.getElementById('resetNewPassword');
const resetConfirmPassword = document.getElementById('resetConfirmPassword');
const btnSubmitNewPassword = document.getElementById('btnSubmitNewPassword');
const btnBackToStep1      = document.getElementById('btnBackToStep1');

const conflictModal       = document.getElementById('conflictModal');
const conflictModalDesc   = document.getElementById('conflictModalDesc');
const conflictCancel      = document.getElementById('conflictCancel');
const conflictProceed     = document.getElementById('conflictProceed');

const confirmModal        = document.getElementById('confirmModal');
const confirmTitle        = document.getElementById('confirmTitle');
const confirmDesc         = document.getElementById('confirmDesc');
const confirmCancel       = document.getElementById('confirmCancel');
const confirmOk           = document.getElementById('confirmOk');

// Theme & Settings
const langToggle          = document.getElementById('langToggle');
const themeToggle         = document.getElementById('themeToggle');
const themeIcon           = document.getElementById('themeIcon');
const paletteToggle       = document.getElementById('paletteToggle');
const paletteMenu         = document.getElementById('paletteMenu');
const audioToggle         = document.getElementById('audioToggle');
const audioIcon           = document.getElementById('audioIcon');

// ─── Inicialización ───────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initThemeAndColor();
  initLanguage();
  initAudioUI();
  initSocket();
  initEventListeners();
  await checkAuthSession();
  await loadAliases();
});

// ─── Tema WhatsApp Oscuro / Claro y Paletas de Colores ─
function initThemeAndColor() {
  const savedTheme = localStorage.getItem('ghost_theme') || 'dark';
  const savedColor = localStorage.getItem('ghost_color') || 'emerald';

  document.body.setAttribute('data-theme', savedTheme);
  document.body.setAttribute('data-color', savedColor);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('ghost_theme', next);
    updateThemeIcon(next);
  });

  paletteToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    paletteMenu.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    paletteMenu.classList.remove('open');
  });

  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-palette');
      document.body.setAttribute('data-color', color);
      localStorage.setItem('ghost_color', color);
      paletteMenu.classList.remove('open');
      showToast(`${t('accent_color')}: ${color}`, 'info');
    });
  });
}

function updateThemeIcon(theme) {
  themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function initLanguage() {
  applyLanguage(currentLang);
  langToggle.addEventListener('click', () => {
    const next = currentLang === 'es' ? 'en' : 'es';
    applyLanguage(next);
  });
}

function updateLimitInfoText() {
  if (modalLimitText) {
    modalLimitText.textContent = currentUser ? t('limit_user') : t('limit_guest');
  }
}

// ─── Audio UI Interactivo con Doble Chime ──────────────
function initAudioUI() {
  updateAudioIcon();
  audioToggle.addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    localStorage.setItem('ghost_audio', audio.enabled);
    updateAudioIcon();
    if (audio.enabled) {
      audio.playDing();
      showToast(t('sound_on'), 'info');
    } else {
      showToast(t('sound_off'), 'info');
    }
  });
}

function updateAudioIcon() {
  audioIcon.className = audio.enabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  audioToggle.style.opacity = audio.enabled ? '1' : '0.5';
}

// ─── Sesión y Autenticación ───────────────────────────
async function checkAuthSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    currentUser = data.user || null;
    maxLimit = data.maxLimit || 5;
    turnstileSiteKey = data.turnstileSiteKey || '1x00000000000000000000AA';
    alreadyVerified = data.alreadyVerified || false;

    updateAuthUI();
    updateLimitInfoText();
  } catch (e) {
    currentUser = null;
    maxLimit = 5;
  }
}

function updateAuthUI() {
  if (currentUser) {
    authBtnText.textContent = currentUser.name || currentUser.username;
    authBtn.classList.add('logged-in');
    authBtn.title = `${currentUser.email} (${t('logout')})`;
  } else {
    authBtnText.textContent = t('login');
    authBtn.classList.remove('logged-in');
    authBtn.title = t('login');
  }
  updateLimitBadge();
}

function updateLimitBadge() {
  aliasCountBadge.textContent = `${aliases.length}/${maxLimit}`;
}

// ─── Socket.io ────────────────────────────────────────
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('[Socket] Conectado en tiempo real al servidor');
  });

  socket.on('new_message', (msg) => {
    const targetEmail = (msg.alias_email || '').toLowerCase();

    if (currentAlias && currentAlias.email.toLowerCase() === targetEmail) {
      audio.playDing();
      messages.unshift(msg);
      renderMessagesFeed();
      showToast(`${t('inbox')}: ${msg.subject}`, 'success');
    }

    const aliasObj = aliases.find(a => a.email.toLowerCase() === targetEmail);
    if (aliasObj) {
      aliasObj.message_count = (aliasObj.message_count || 0) + 1;
      renderSidebarList();
      renderCreatedEmailsBar();
    }
  });

  socket.on('alias_deleted', ({ email }) => {
    aliases = aliases.filter(a => a.email.toLowerCase() !== email.toLowerCase());
    renderSidebarList();
    renderCreatedEmailsBar();
    if (currentAlias && currentAlias.email.toLowerCase() === email.toLowerCase()) {
      if (aliases.length > 0) {
        selectAlias(aliases[0].email);
      } else {
        showWelcomeScreen();
      }
    }
  });
}

// ─── Carga de Aliases ─────────────────────────────────
async function loadAliases() {
  try {
    const res = await fetch('/api/aliases');
    aliases = await res.json();
    renderSidebarList();
    renderCreatedEmailsBar();

    const savedEmail = localStorage.getItem('ghost_active_email');
    const existing = aliases.find(a => a.email.toLowerCase() === (savedEmail || '').toLowerCase());

    if (existing) {
      selectAlias(existing.email);
    } else if (aliases.length > 0) {
      selectAlias(aliases[0].email);
    } else {
      showWelcomeScreen();
    }
  } catch (err) {
    console.error('Error al cargar aliases:', err);
    showWelcomeScreen();
  }
}

function renderSidebarList() {
  updateLimitBadge();

  if (aliases.length === 0) {
    aliasList.innerHTML = `
      <div class="sidebar-empty">
        <i class="fa-solid fa-inbox"></i>
        <p>${t('no_aliases')}</p>
      </div>`;
    return;
  }

  aliasList.innerHTML = '';
  aliases.forEach(a => {
    const item = document.createElement('div');
    item.className = 'alias-item' + (currentAlias && currentAlias.email.toLowerCase() === a.email.toLowerCase() ? ' active' : '');

    let iconClass = 'fa-brands fa-google';
    let provName = 'Gmail';
    if (a.provider === 'googlemail') {
      provName = 'Googlemail';
    } else if (a.provider === 'outlook') {
      iconClass = 'fa-brands fa-microsoft';
      provName = 'Outlook';
    }

    item.innerHTML = `
      <div class="alias-item-email">${escapeHtml(a.email)}</div>
      <div class="alias-item-meta">
        <span><i class="${iconClass}"></i> ${provName}</span>
        ${a.message_count > 0 ? `<span class="alias-item-unread">${a.message_count}</span>` : ''}
      </div>
    `;

    item.addEventListener('click', () => selectAlias(a.email));
    aliasList.appendChild(item);
  });
}

// ─── Barra superior de correos creados (Punto 3) ───────
function renderCreatedEmailsBar() {
  if (!createdEmailsPills) return;

  if (aliases.length === 0) {
    createdEmailsPills.innerHTML = `<span style="font-size:12px;color:var(--text-muted);">${t('no_aliases')}</span>`;
    return;
  }

  createdEmailsPills.innerHTML = '';
  aliases.forEach((a) => {
    const pill = document.createElement('div');
    const isActive = currentAlias && currentAlias.email.toLowerCase() === a.email.toLowerCase();
    pill.className = `email-pill-tab ${isActive ? 'active' : ''}`;

    let iconClass = a.provider === 'outlook' ? 'fa-brands fa-microsoft' : 'fa-brands fa-google';
    pill.innerHTML = `
      <i class="${iconClass}"></i>
      <span>${escapeHtml(a.email)}</span>
      ${a.message_count > 0 ? `<span class="alias-item-unread">${a.message_count}</span>` : ''}
    `;

    pill.addEventListener('click', () => selectAlias(a.email));
    createdEmailsPills.appendChild(pill);
  });
}

function showWelcomeScreen() {
  currentAlias = null;
  localStorage.removeItem('ghost_active_email');
  welcomeScreen.style.display = 'flex';
  aliasView.style.display = 'none';
  renderSidebarList();
  renderCreatedEmailsBar();
}

function selectAlias(email) {
  const target = aliases.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (!target) return;

  currentAlias = target;
  localStorage.setItem('ghost_active_email', target.email);

  welcomeScreen.style.display = 'none';
  aliasView.style.display = 'block';

  aliasEmailDisplay.textContent = target.email;

  let badgeHtml = '<i class="fa-brands fa-google"></i> Gmail';
  if (target.provider === 'googlemail') {
    badgeHtml = '<i class="fa-brands fa-google"></i> Googlemail';
  } else if (target.provider === 'outlook') {
    badgeHtml = '<i class="fa-brands fa-microsoft"></i> Outlook';
  }
  aliasProviderBadge.innerHTML = badgeHtml;

  renderSidebarList();
  renderCreatedEmailsBar();
  loadMessages(target.email);
}

// ─── Mensajes e HISTORIAL ─────────────────────────────
async function loadMessages(aliasEmail) {
  messagesFeed.innerHTML = '';
  emptyState.style.display = 'none';
  messageCountBadge.textContent = '...';

  try {
    const res = await fetch(`/api/messages/${encodeURIComponent(aliasEmail)}`);
    messages = await res.json();
    renderMessagesFeed();
  } catch (err) {
    messages = [];
    renderMessagesFeed();
  }
}

function renderMessagesFeed() {
  messageCountBadge.textContent = messages.length;

  if (messages.length === 0) {
    emptyState.style.display = 'block';
    messagesFeed.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';
  messagesFeed.innerHTML = '';

  messages.forEach(msg => {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.id = `msg-${msg.id}`;

    const dateFormatted = new Date(msg.date_received).toLocaleString(currentLang === 'es' ? 'es-PE' : 'en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    let otpHtml = '';
    if (msg.otp) {
      otpHtml = `
        <div class="otp-spotlight">
          <div class="otp-left">
            <span class="otp-tag-label"><i class="fa-solid fa-key"></i> ${t('detected_code')}</span>
            <span class="otp-code-value">${escapeHtml(msg.otp)}</span>
          </div>
          <button class="btn-quick-copy-otp" onclick="copyOtpCode('${escapeHtml(msg.otp)}')">
            <i class="fa-regular fa-copy"></i>
            <span>${t('copy')}</span>
          </button>
        </div>`;
    }

    let actionBtnHtml = '';
    if (msg.action_url) {
      actionBtnHtml = `
        <div class="action-link-row">
          <a href="${escapeHtml(msg.action_url)}" target="_blank" rel="noopener noreferrer" class="btn-open-action-link">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>${t('confirm_action_link')}</span>
          </a>
        </div>`;
    }

    const bodyContent = msg.html
      ? `<iframe class="email-iframe" srcdoc="${escapeAttr(msg.html)}" sandbox="allow-same-origin" scrolling="auto"></iframe>`
      : `<div class="email-plain">${escapeHtml(msg.text_body || '')}</div>`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-top-row">
          <div class="sender-pill">
            <i class="fa-solid fa-circle-user"></i>
            <span>${escapeHtml(msg.from_addr || 'Desconocido')}</span>
          </div>
          <div class="card-meta">
            <span class="date-stamp">${dateFormatted}</span>
            <button class="btn-delete-msg" title="${t('delete')}" data-id="${msg.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <h3 class="message-subject">${escapeHtml(msg.subject)}</h3>
        <p class="card-preview">${escapeHtml(msg.preview || '')}</p>

        <div class="card-expand-row">
          <i class="fa-solid fa-chevron-down expand-arrow"></i>
          <span class="expand-text">${t('full_email_open')}</span>
        </div>
      </div>

      ${otpHtml}

      <div class="card-body-expanded">
        <div class="email-body-wrapper">
          ${bodyContent}
        </div>
        ${actionBtnHtml}
      </div>
    `;

    const header = card.querySelector('.card-header');
    const bodyExpanded = card.querySelector('.card-body-expanded');
    const arrow = card.querySelector('.expand-arrow');
    const expandText = card.querySelector('.expand-text');
    const deleteBtn = card.querySelector('.btn-delete-msg');

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openConfirmDialog({
        title: t('confirm_title'),
        desc: t('delete_msg_prompt'),
        onConfirm: async () => {
          await deleteMessage(msg.id);
        }
      });
    });

    header.addEventListener('click', () => {
      const isOpen = bodyExpanded.classList.toggle('open');
      arrow.classList.toggle('open', isOpen);
      expandText.textContent = isOpen ? t('full_email_close') : t('full_email_open');

      if (isOpen) {
        const iframe = card.querySelector('.email-iframe');
        if (iframe && !iframe.dataset.loaded) {
          iframe.dataset.loaded = 'true';
          iframe.addEventListener('load', () => {
            try {
              const h = iframe.contentDocument?.body?.scrollHeight;
              if (h) iframe.style.height = (h + 30) + 'px';
            } catch (e) {}
          });
        }
      }
    });

    messagesFeed.appendChild(card);
  });
}

// ─── Eliminar Mensaje ─────────────────────────────────
async function deleteMessage(id) {
  try {
    const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
    if (res.ok) {
      messages = messages.filter(m => m.id !== id);
      renderMessagesFeed();
      if (currentAlias && currentAlias.message_count > 0) {
        currentAlias.message_count--;
        renderSidebarList();
        renderCreatedEmailsBar();
      }
      showToast(t('delete') + ' OK', 'success');
    } else {
      showToast('Error', 'error');
    }
  } catch (err) {
    showToast('Error', 'error');
  }
}

// ─── Eliminar Alias ───────────────────────────────────
function confirmDeleteCurrentAlias() {
  if (!currentAlias) return;
  openConfirmDialog({
    title: t('confirm_title'),
    desc: `<b>${escapeHtml(currentAlias.email)}</b><br>${t('delete_alias_prompt')}`,
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/aliases/${encodeURIComponent(currentAlias.email)}`, { method: 'DELETE' });
        if (res.ok) {
          aliases = aliases.filter(a => a.email.toLowerCase() !== currentAlias.email.toLowerCase());
          showToast(t('delete') + ' OK', 'success');
          if (aliases.length > 0) {
            selectAlias(aliases[0].email);
          } else {
            showWelcomeScreen();
          }
        } else {
          showToast('Error', 'error');
        }
      } catch (e) {
        showToast('Error', 'error');
      }
    }
  });
}

// ─── Abrir Modal Crear con Lógica Cloudflare ───────────
function openCreateModalLogic() {
  if (aliases.length >= maxLimit) {
    showToast(currentUser ? t('limit_reached_user') : t('limit_reached_guest'), 'error');
    if (!currentUser) openAuthModal('register');
    return;
  }

  const needsVerification = !alreadyVerified && aliases.length === 0 && !currentUser;

  if (needsVerification) {
    turnstileCreateContainer.style.display = 'flex';
    renderCreateTurnstile();
  } else {
    turnstileCreateContainer.style.display = 'none';
  }

  openModal(createModal);
}

// ─── Crear Nuevo Alias ────────────────────────────────
async function createNewAlias() {
  if (aliases.length >= maxLimit) {
    showToast(currentUser ? t('limit_reached_user') : t('limit_reached_guest'), 'error');
    if (!currentUser) {
      closeModal(createModal);
      openAuthModal('register');
    }
    return;
  }

  const selectedRadio = document.querySelector('input[name="provider"]:checked');
  const mode = selectedRadio ? selectedRadio.value : 'dots';

  const needsVerification = !alreadyVerified && aliases.length === 0 && !currentUser;
  let turnstileToken = '';
  if (needsVerification && window.turnstile && turnstileCreateWidgetId !== null) {
    try {
      turnstileToken = turnstile.getResponse(turnstileCreateWidgetId);
    } catch(e) {}
  }

  btnGenerateModal.disabled = true;
  btnGenerateModal.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

  try {
    const res = await fetch('/api/aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, turnstileToken })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Error', 'error');
      if (data.limitReached && !currentUser) {
        closeModal(createModal);
        openAuthModal('register');
      }
      return;
    }

    alreadyVerified = true;
    closeModal(createModal);
    await loadAliases();
    selectAlias(data.email);
    showToast(`${data.email}`, 'success');
  } catch (err) {
    showToast('Error de conexión', 'error');
  } finally {
    btnGenerateModal.disabled = false;
    btnGenerateModal.innerHTML = `<i class="fa-solid fa-bolt"></i> <span>${t('btn_generate')}</span>`;
  }
}

// ─── Autenticación (Login / Registro / Olvidé Contraseña) ───────────────────
function openAuthModal(view = 'login') {
  authTabsNav.style.display = 'flex';
  loginForm.style.display = 'none';
  registerForm.style.display = 'none';
  forgotFormStep1.style.display = 'none';
  forgotFormStep2.style.display = 'none';

  loginSubmitBtn.innerHTML = `<span>${t('login')}</span>`;
  regSubmitBtn.innerHTML = `<span>${t('create_account')}</span>`;
  btnSendResetCode.innerHTML = `<span>${t('send_code')}</span>`;
  btnSubmitNewPassword.innerHTML = `<span>${t('change_password')}</span>`;

  if (view === 'login') {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.style.display = 'flex';
  } else if (view === 'register') {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.style.display = 'flex';
    renderAuthTurnstile();
  } else if (view === 'forgotStep1') {
    authTabsNav.style.display = 'none';
    forgotFormStep1.style.display = 'flex';
  } else if (view === 'forgotStep2') {
    authTabsNav.style.display = 'none';
    forgotFormStep2.style.display = 'flex';
  }
  openModal(authModal);
}

// Enviar Login con verificación de conflicto de 10 correos
async function handleLoginSubmit(forceDiscardGuest = false) {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  if (!email || !password) {
    showToast(t('err_missing_fields'), 'error');
    return;
  }

  loginSubmitBtn.disabled = true;
  loginSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, forceDiscardGuest })
    });
    const data = await res.json();

    // Caso de conflicto de límite de 10 correos
    if (res.status === 409 && data.conflict) {
      pendingConflictLogin = { email, password };
      conflictModalDesc.textContent = data.message;
      conflictModal.classList.add('open');
      return;
    }

    if (!res.ok) {
      showToast(getTranslatedError(data), 'error');
      return;
    }

    currentUser = data.user;
    maxLimit = data.maxLimit || 10;
    alreadyVerified = true;
    updateAuthUI();
    closeModal(authModal);
    showToast(`${t('msg_welcome_user')} ${currentUser.name || currentUser.username}`, 'success');
    await loadAliases();
  } catch (e) {
    showToast(t('err_connection'), 'error');
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.innerHTML = `<span>${t('login')}</span>`;
  }
}

// Enviar Registro con validaciones estrictas
async function handleRegisterSubmit() {
  const name = regName.value.trim();
  const email = regEmail.value.trim().toLowerCase();
  const username = regUsername.value.trim().toLowerCase();
  const password = regPassword.value;
  const confirmPassword = regConfirmPassword.value;

  // 1. Validar nombre (solo letras y espacios)
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{2,50}$/;
  if (!name || !nameRegex.test(name)) {
    showToast(t('err_name_invalid'), 'error');
    return;
  }

  // 2. Validar correo (RFC y no desechable)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    showToast(t('err_email_invalid'), 'error');
    return;
  }
  if (isFrontendDisposableEmail(email)) {
    showToast(t('err_disposable_email'), 'error');
    return;
  }

  // 3. Validar usuario (comienza con letra, 3-20 caracteres, no solo números)
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
  if (!username || !usernameRegex.test(username)) {
    showToast(t('err_username_invalid'), 'error');
    return;
  }

  // 4. Validar contraseña segura (min 8 chars, mayúscula, número y símbolo)
  if (!isFrontendStrongPassword(password)) {
    showToast(t('err_weak_password'), 'error');
    return;
  }
  if (password !== confirmPassword) {
    showToast(t('err_password_mismatch'), 'error');
    return;
  }

  let turnstileToken = '';
  if (window.turnstile && turnstileAuthWidgetId !== null) {
    try {
      turnstileToken = turnstile.getResponse(turnstileAuthWidgetId);
    } catch(e) {}
  }

  regSubmitBtn.disabled = true;
  regSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, username, password, confirmPassword, turnstileToken })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(getTranslatedError(data), 'error');
      return;
    }

    currentUser = data.user;
    maxLimit = data.maxLimit || 10;
    alreadyVerified = true;
    updateAuthUI();
    closeModal(authModal);
    showToast(`${t('msg_account_created')}: ${currentUser.name || currentUser.username}`, 'success');
    await loadAliases();
  } catch (e) {
    showToast(t('err_connection'), 'error');
  } finally {
    regSubmitBtn.disabled = false;
    regSubmitBtn.innerHTML = `<span>${t('create_account')}</span>`;
  }
}

// ─── Recuperación de Contraseña ─────────────────────────────────────────────
async function handleSendResetCode() {
  const email = forgotEmail.value.trim().toLowerCase();
  if (!email) {
    showToast(t('err_missing_email'), 'error');
    return;
  }

  btnSendResetCode.disabled = true;
  btnSendResetCode.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(getTranslatedError(data), 'error');
      return;
    }

    resetPendingEmail = email;
    showToast(data.message || t('msg_code_sent'), 'success');
    openAuthModal('forgotStep2');
  } catch (e) {
    showToast(t('err_connection'), 'error');
  } finally {
    btnSendResetCode.disabled = false;
    btnSendResetCode.innerHTML = `<span>${t('send_code')}</span>`;
  }
}

async function handleResetPasswordSubmit() {
  const code = resetOtpCode.value.trim();
  const newPassword = resetNewPassword.value;
  const confirmNewPassword = resetConfirmPassword.value;

  if (!code || code.length !== 6) {
    showToast(t('err_invalid_code'), 'error');
    return;
  }
  if (!isFrontendStrongPassword(newPassword)) {
    showToast(t('err_weak_password'), 'error');
    return;
  }
  if (newPassword !== confirmNewPassword) {
    showToast(t('err_password_mismatch'), 'error');
    return;
  }

  btnSubmitNewPassword.disabled = true;
  btnSubmitNewPassword.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetPendingEmail,
        code,
        newPassword,
        confirmNewPassword
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(getTranslatedError(data), 'error');
      return;
    }

    showToast(t('msg_password_reset_success'), 'success');
    loginEmail.value = resetPendingEmail;
    loginPassword.value = '';
    openAuthModal('login');
  } catch (e) {
    showToast(t('err_connection'), 'error');
  } finally {
    btnSubmitNewPassword.disabled = false;
    btnSubmitNewPassword.innerHTML = `<span>${t('change_password')}</span>`;
  }
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  maxLimit = 5;
  updateAuthUI();
  showToast(t('logout'), 'info');
  await loadAliases();
}

function renderAuthTurnstile() {
  if (!turnstileSiteKey || !window.turnstile) return;
  try {
    if (turnstileAuthWidgetId === null && document.getElementById('turnstileAuthContainer')) {
      turnstileAuthWidgetId = turnstile.render('#turnstileAuthContainer', {
        sitekey: turnstileSiteKey,
        theme: 'auto'
      });
    }
  } catch(e) {}
}

function renderCreateTurnstile() {
  if (!turnstileSiteKey || !window.turnstile) return;
  try {
    if (turnstileCreateWidgetId === null && document.getElementById('turnstileCreateContainer')) {
      turnstileCreateWidgetId = turnstile.render('#turnstileCreateContainer', {
        sitekey: turnstileSiteKey,
        theme: 'auto'
      });
    }
  } catch(e) {}
}

// ─── Confirm Dialog ───────────────────────────────────
function openConfirmDialog({ title, desc, confirmBtnText, onConfirm }) {
  confirmTitle.textContent = title;
  confirmDesc.innerHTML = desc;
  confirmOk.textContent = confirmBtnText || t('confirm_delete');
  pendingConfirmCallback = onConfirm;
  confirmModal.classList.add('open');
}

function closeConfirmDialog() {
  confirmModal.classList.remove('open');
  pendingConfirmCallback = null;
}

// ─── Helpers: Modal, Copy & Toast ─────────────────────
function openModal(modal) {
  modal.classList.add('open');
}

function closeModal(modal) {
  modal.classList.remove('open');
}

window.copyOtpCode = function(code) {
  navigator.clipboard.writeText(code);
  showToast(`${t('detected_code')} ${code}`, 'success');
};

function copyCurrentEmail() {
  if (!currentAlias) return;
  navigator.clipboard.writeText(currentAlias.email);
  copyBtnText.textContent = t('copied');
  btnCopyAlias.style.background = 'var(--accent-primary)';
  btnCopyAlias.style.color = '#fff';
  setTimeout(() => {
    copyBtnText.textContent = t('copy');
    btnCopyAlias.style.background = '';
    btnCopyAlias.style.color = '';
  }, 1800);
  showToast(`${currentAlias.email}`, 'success');
}

function showToast(text, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${text}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Event Listeners ──────────────────────────────────
function initEventListeners() {
  btnCopyAlias.addEventListener('click', copyCurrentEmail);
  btnDeleteAlias.addEventListener('click', confirmDeleteCurrentAlias);

  btnCreateBig.addEventListener('click', openCreateModalLogic);
  btnCreateNew.addEventListener('click', openCreateModalLogic);
  if (btnMiniAddAlias) btnMiniAddAlias.addEventListener('click', openCreateModalLogic);

  modalClose.addEventListener('click', () => closeModal(createModal));
  createModal.addEventListener('click', (e) => {
    if (e.target === createModal) closeModal(createModal);
  });
  btnGenerateModal.addEventListener('click', createNewAlias);

  // Auth Modal
  authBtn.addEventListener('click', () => {
    if (currentUser) {
      const name = escapeHtml(currentUser.name || currentUser.username);
      openConfirmDialog({
        title: t('logout'),
        desc: t('logout_prompt').replace('{name}', name),
        confirmBtnText: t('logout'),
        onConfirm: handleLogout
      });
    } else {
      openAuthModal('login');
    }
  });

  authModalClose.addEventListener('click', () => closeModal(authModal));
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal(authModal);
  });

  tabLoginBtn.addEventListener('click', () => openAuthModal('login'));
  tabRegisterBtn.addEventListener('click', () => openAuthModal('register'));

  loginForm.addEventListener('submit', () => handleLoginSubmit(false));
  registerForm.addEventListener('submit', handleRegisterSubmit);

  // Olvidé mi contraseña
  btnGoToForgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('forgotStep1');
  });
  btnBackToLoginFromForgot.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('login');
  });
  btnBackToStep1.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('forgotStep1');
  });
  forgotFormStep1.addEventListener('submit', handleSendResetCode);
  forgotFormStep2.addEventListener('submit', handleResetPasswordSubmit);

  // Modal de Conflicto de Límites (Punto 6)
  conflictCancel.addEventListener('click', () => {
    conflictModal.classList.remove('open');
    pendingConflictLogin = null;
  });
  conflictProceed.addEventListener('click', async () => {
    conflictModal.classList.remove('open');
    if (pendingConflictLogin) {
      loginEmail.value = pendingConflictLogin.email;
      loginPassword.value = pendingConflictLogin.password;
      await handleLoginSubmit(true); // forceDiscardGuest = true
      pendingConflictLogin = null;
    }
  });

  // Confirm Modal
  confirmCancel.addEventListener('click', closeConfirmDialog);
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeConfirmDialog();
  });
  confirmOk.addEventListener('click', async () => {
    if (pendingConfirmCallback) {
      const cb = pendingConfirmCallback;
      closeConfirmDialog();
      await cb();
    }
  });

  // Mostrar / Ocultar contraseñas (Punto 3)
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fa-regular fa-eye-slash';
      } else {
        input.type = 'password';
        if (icon) icon.className = 'fa-regular fa-eye';
      }
    });
  });
}
