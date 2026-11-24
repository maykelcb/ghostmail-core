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
    username: "Usuario",
    password: "Contraseña",
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
    full_name: "Nombre completo",
    recovery_email: "Correo de recuperación personal",
    confirm_password: "Confirmar contraseña",
    create_account: "Crear cuenta",
    verify_once_hint: "Verificación Cloudflare requerida para el primer correo:",
    cf_verification: "Verificación antibot de Cloudflare:",
    sound_on: "Sonido activado",
    sound_off: "Sonido silenciado"
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
    username: "Username",
    password: "Password",
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
    full_name: "Full name",
    recovery_email: "Personal recovery email",
    confirm_password: "Confirm password",
    create_account: "Create account",
    verify_once_hint: "Cloudflare verification required for your first email:",
    cf_verification: "Cloudflare bot verification:",
    sound_on: "Sound enabled",
    sound_off: "Sound muted"
  }
};

let currentLang = localStorage.getItem('ghost_lang') || 'es';

function t(key) {
  return translations[currentLang]?.[key] || translations['es']?.[key] || key;
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

  updateLimitInfoText();
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

      // Primer tono suave (E5 a A5)
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

      // Segundo tono campanita WhatsApp (C6 a E6)
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
const turnstileCreateWrapper = document.getElementById('turnstileCreateWrapper');

const authModal           = document.getElementById('authModal');
const authModalClose      = document.getElementById('authModalClose');
const authBtn             = document.getElementById('authBtn');
const authBtnText         = document.getElementById('authBtnText');
const tabLoginBtn         = document.getElementById('tabLoginBtn');
const tabRegisterBtn      = document.getElementById('tabRegisterBtn');

const loginForm           = document.getElementById('loginForm');
const loginUsername       = document.getElementById('loginUsername');
const loginPassword       = document.getElementById('loginPassword');
const loginSubmitBtn      = document.getElementById('loginSubmitBtn');

const registerForm        = document.getElementById('registerForm');
const regName             = document.getElementById('regName');
const regRecovery         = document.getElementById('regRecovery');
const regUsername         = document.getElementById('regUsername');
const regPassword         = document.getElementById('regPassword');
const regConfirmPassword  = document.getElementById('regConfirmPassword');
const regSubmitBtn        = document.getElementById('regSubmitBtn');

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

// ─── Audio UI Interactivo ─────────────────────────────
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
    authBtnText.textContent = currentUser.username;
    authBtn.classList.add('logged-in');
    authBtn.title = `${currentUser.username} (${t('logout')})`;
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
// "si ya hay un correo que este debajo de ese correo, si hay 3 correos que este debajo de esos 3 correos"
function renderCreatedEmailsBar() {
  if (!createdEmailsPills) return;

  if (aliases.length === 0) {
    createdEmailsPills.innerHTML = `<span style="font-size:12px;color:var(--text-muted);">${t('no_aliases')}</span>`;
    return;
  }

  createdEmailsPills.innerHTML = '';
  aliases.forEach((a, index) => {
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

// ─── Abrir Modal Crear con Lógica Cloudflare Primera Vez ─
function openCreateModalLogic() {
  if (aliases.length >= maxLimit) {
    showToast(currentUser ? t('limit_reached_user') : t('limit_reached_guest'), 'error');
    if (!currentUser) openAuthModal('register');
    return;
  }

  // Cloudflare solo se muestra si NO se ha verificado aún en esta sesión Y no tiene correos
  const needsVerification = !alreadyVerified && aliases.length === 0 && !currentUser;

  if (needsVerification) {
    turnstileCreateWrapper.style.display = 'block';
    renderCreateTurnstile();
  } else {
    turnstileCreateWrapper.style.display = 'none';
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

    alreadyVerified = true; // Ya no pedirá Cloudflare para los siguientes correos
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

// ─── Autenticación (Login / Registro Completo) ─────────
function openAuthModal(tab = 'login') {
  if (tab === 'login') {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
  } else {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    renderAuthTurnstile();
  }
  openModal(authModal);
}

async function handleLoginSubmit() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) return;

  loginSubmitBtn.disabled = true;
  loginSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Error', 'error');
      return;
    }

    currentUser = data.user;
    maxLimit = data.maxLimit || 10;
    alreadyVerified = true;
    updateAuthUI();
    closeModal(authModal);
    showToast(`Bienvenido ${currentUser.username} (Límite: ${maxLimit})`, 'success');
    await loadAliases();
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.innerHTML = `<span>${t('login')}</span>`;
  }
}

async function handleRegisterSubmit() {
  const name = regName.value.trim();
  const recoveryEmail = regRecovery.value.trim();
  const username = regUsername.value.trim();
  const password = regPassword.value;
  const confirmPassword = regConfirmPassword.value;

  if (!name || !recoveryEmail || !username || !password) {
    showToast('Por favor completa todos los campos', 'error');
    return;
  }
  if (password !== confirmPassword) {
    showToast('Las contraseñas no coinciden', 'error');
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
      body: JSON.stringify({ name, recoveryEmail, username, password, confirmPassword, turnstileToken })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Error al registrar', 'error');
      return;
    }

    currentUser = data.user;
    maxLimit = data.maxLimit || 10;
    alreadyVerified = true;
    updateAuthUI();
    closeModal(authModal);
    showToast(`Cuenta creada exitosamente: ${currentUser.username} (Límite: 10 correos)`, 'success');
    await loadAliases();
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    regSubmitBtn.disabled = false;
    regSubmitBtn.innerHTML = `<span>${t('create_account')}</span>`;
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
function openConfirmDialog({ title, desc, onConfirm }) {
  confirmTitle.textContent = title;
  confirmDesc.innerHTML = desc;
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

  // Botón crear en sidebar, bienvenida y barra superior
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
      openConfirmDialog({
        title: t('logout'),
        desc: `¿Deseas cerrar la sesión de <b>${escapeHtml(currentUser.username)}</b>?`,
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

  loginForm.addEventListener('submit', handleLoginSubmit);
  registerForm.addEventListener('submit', handleRegisterSubmit);

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
}
