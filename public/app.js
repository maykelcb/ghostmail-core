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
    limit_reached_user: "Has alcanzado el límite máximo de 10 correos simultáneos. Elimina alguno para crear uno nuevo."
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
    limit_reached_user: "You have reached the 10 simultaneous emails limit. Delete one to create a new one."
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

// ─── Web Audio API Chime ─────────────────────────────
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
  }

  playDing() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
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
let turnstileSiteKey = '';
let turnstileAuthWidgetId = null;
let turnstileCreateWidgetId = null;
let currentAuthTab = 'login'; // 'login' | 'register'

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

// Modals
const createModal         = document.getElementById('createModal');
const modalClose          = document.getElementById('modalClose');
const btnCreateBig        = document.getElementById('btnCreateBig');
const btnCreateNew        = document.getElementById('btnCreateNew');
const btnGenerateModal    = document.getElementById('btnGenerateModal');
const modalLimitText      = document.getElementById('modalLimitText');

const authModal           = document.getElementById('authModal');
const authModalClose      = document.getElementById('authModalClose');
const authBtn             = document.getElementById('authBtn');
const authBtnText         = document.getElementById('authBtnText');
const tabLoginBtn         = document.getElementById('tabLoginBtn');
const tabRegisterBtn      = document.getElementById('tabRegisterBtn');
const authForm            = document.getElementById('authForm');
const authUsername        = document.getElementById('authUsername');
const authPassword        = document.getElementById('authPassword');
const authSubmitBtn       = document.getElementById('authSubmitBtn');
const authSubmitText      = document.getElementById('authSubmitText');

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

// ─── Tema Claro / Oscuro y Paletas de Colores ─────────
function initThemeAndColor() {
  const savedTheme = localStorage.getItem('ghost_theme') || 'dark';
  const savedColor = localStorage.getItem('ghost_color') || 'emerald';

  document.body.setAttribute('data-theme', savedTheme);
  document.body.setAttribute('data-color', savedColor);
  updateThemeIcon(savedTheme);

  // Toggle Tema
  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('ghost_theme', next);
    updateThemeIcon(next);
  });

  // Toggle Paleta
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

// ─── Audio UI ─────────────────────────────────────────
function initAudioUI() {
  updateAudioIcon();
  audioToggle.addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    localStorage.setItem('ghost_audio', audio.enabled);
    updateAudioIcon();
    showToast(audio.enabled ? 'Sonido activado' : 'Sonido silenciado', 'info');
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
    turnstileSiteKey = data.turnstileSiteKey || '';

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
    }
  });

  socket.on('alias_deleted', ({ email }) => {
    aliases = aliases.filter(a => a.email.toLowerCase() !== email.toLowerCase());
    renderSidebarList();
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

function showWelcomeScreen() {
  currentAlias = null;
  localStorage.removeItem('ghost_active_email');
  welcomeScreen.style.display = 'flex';
  aliasView.style.display = 'none';
  renderSidebarList();
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
  loadMessages(target.email);
}

// ─── Mensajes ─────────────────────────────────────────
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

// ─── Crear Nuevo Alias con Validación de Límites ──────
async function createNewAlias() {
  if (aliases.length >= maxLimit) {
    const msg = currentUser ? t('limit_reached_user') : t('limit_reached_guest');
    showToast(msg, 'error');
    if (!currentUser) {
      closeModal(createModal);
      openAuthModal('register');
    }
    return;
  }

  const selectedRadio = document.querySelector('input[name="provider"]:checked');
  const mode = selectedRadio ? selectedRadio.value : 'dots';

  let turnstileToken = '';
  if (window.turnstile && turnstileCreateWidgetId !== null) {
    try { turnstileToken = turnstile.getResponse(turnstileCreateWidgetId); } catch(e) {}
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

// ─── Autenticación (Login / Registro) ─────────────────
function openAuthModal(tab = 'login') {
  currentAuthTab = tab;
  if (tab === 'login') {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    authSubmitText.textContent = t('login');
  } else {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    authSubmitText.textContent = t('tab_register');
  }
  authUsername.value = '';
  authPassword.value = '';
  openModal(authModal);
  renderTurnstileWidgets();
}

async function handleAuthSubmit() {
  const username = authUsername.value.trim();
  const password = authPassword.value;
  if (!username || !password) return;

  let turnstileToken = '';
  if (window.turnstile && turnstileAuthWidgetId !== null) {
    try { turnstileToken = turnstile.getResponse(turnstileAuthWidgetId); } catch(e) {}
  }

  const endpoint = currentAuthTab === 'register' ? '/api/auth/register' : '/api/auth/login';

  authSubmitBtn.disabled = true;
  authSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, turnstileToken })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Error', 'error');
      return;
    }

    currentUser = data.user;
    maxLimit = data.maxLimit || 10;
    updateAuthUI();
    closeModal(authModal);
    showToast(`Bienvenido ${currentUser.username} (Límite: ${maxLimit})`, 'success');
    await loadAliases();
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitText.textContent = currentAuthTab === 'register' ? t('tab_register') : t('login');
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

function renderTurnstileWidgets() {
  if (!turnstileSiteKey || !window.turnstile) return;
  try {
    if (turnstileAuthWidgetId === null && document.getElementById('turnstileAuthContainer')) {
      turnstileAuthWidgetId = turnstile.render('#turnstileAuthContainer', { sitekey: turnstileSiteKey, theme: 'auto' });
    }
    if (turnstileCreateWidgetId === null && document.getElementById('turnstileCreateContainer')) {
      turnstileCreateWidgetId = turnstile.render('#turnstileCreateContainer', { sitekey: turnstileSiteKey, theme: 'auto' });
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
  renderTurnstileWidgets();
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

  // Botón crear en sidebar y bienvenida
  btnCreateBig.addEventListener('click', () => {
    if (aliases.length >= maxLimit) {
      showToast(currentUser ? t('limit_reached_user') : t('limit_reached_guest'), 'error');
      if (!currentUser) openAuthModal('register');
      return;
    }
    openModal(createModal);
  });

  btnCreateNew.addEventListener('click', () => {
    if (aliases.length >= maxLimit) {
      showToast(currentUser ? t('limit_reached_user') : t('limit_reached_guest'), 'error');
      if (!currentUser) openAuthModal('register');
      return;
    }
    openModal(createModal);
  });

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

  tabLoginBtn.addEventListener('click', () => {
    currentAuthTab = 'login';
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    authSubmitText.textContent = t('login');
  });

  tabRegisterBtn.addEventListener('click', () => {
    currentAuthTab = 'register';
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    authSubmitText.textContent = t('tab_register');
  });

  authForm.addEventListener('submit', handleAuthSubmit);

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
