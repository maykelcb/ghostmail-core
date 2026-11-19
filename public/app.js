/**
 * GhostMail Core v2 — Frontend Controller & WebSocket Client
 */

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

const confirmModal        = document.getElementById('confirmModal');
const confirmTitle        = document.getElementById('confirmTitle');
const confirmDesc         = document.getElementById('confirmDesc');
const confirmCancel       = document.getElementById('confirmCancel');
const confirmOk           = document.getElementById('confirmOk');

const audioToggle         = document.getElementById('audioToggle');
const audioIcon           = document.getElementById('audioIcon');

// ─── Inicialización ───────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initAudioUI();
  initSocket();
  initEventListeners();
  await loadAliases();
});

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

// ─── Socket.io ────────────────────────────────────────
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('[Socket] Conectado en tiempo real al servidor');
  });

  socket.on('new_message', (msg) => {
    const targetEmail = (msg.alias_email || '').toLowerCase();
    
    // Si el mensaje es para el alias que está viendo el usuario
    if (currentAlias && currentAlias.email.toLowerCase() === targetEmail) {
      audio.playDing();
      messages.unshift(msg);
      renderMessagesFeed();
      showToast(`Nuevo correo recibido: ${msg.subject}`, 'success');
    }

    // Actualizar conteo en el historial del sidebar
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
  aliasCountBadge.textContent = aliases.length;

  if (aliases.length === 0) {
    aliasList.innerHTML = `
      <div class="sidebar-empty">
        <i class="fa-solid fa-inbox"></i>
        <p>Sin alias generados</p>
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

  // Provider badge
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
    console.error('Error al cargar mensajes:', err);
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

    const dateFormatted = new Date(msg.date_received).toLocaleString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Banner OTP
    let otpHtml = '';
    if (msg.otp) {
      otpHtml = `
        <div class="otp-spotlight">
          <div class="otp-left">
            <span class="otp-tag-label"><i class="fa-solid fa-key"></i> CÓDIGO DETECTADO:</span>
            <span class="otp-code-value">${escapeHtml(msg.otp)}</span>
          </div>
          <button class="btn-quick-copy-otp" onclick="copyOtpCode('${escapeHtml(msg.otp)}')">
            <i class="fa-regular fa-copy"></i>
            <span>Copiar</span>
          </button>
        </div>`;
    }

    // Botón de acción si hay URL
    let actionBtnHtml = '';
    if (msg.action_url) {
      actionBtnHtml = `
        <div class="action-link-row">
          <a href="${escapeHtml(msg.action_url)}" target="_blank" rel="noopener noreferrer" class="btn-open-action-link">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>Confirmar / Abrir Enlace</span>
          </a>
        </div>`;
    }

    // Cuerpo expandible (HTML en iframe o texto)
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
            <button class="btn-delete-msg" title="Eliminar este mensaje" data-id="${msg.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <h3 class="message-subject">${escapeHtml(msg.subject)}</h3>
        <p class="card-preview">${escapeHtml(msg.preview || '(Sin texto previo)')}</p>

        <div class="card-expand-row">
          <i class="fa-solid fa-chevron-down expand-arrow"></i>
          <span class="expand-text">Ver correo completo</span>
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

    // Interacción para colapsar/expandir
    const header = card.querySelector('.card-header');
    const bodyExpanded = card.querySelector('.card-body-expanded');
    const arrow = card.querySelector('.expand-arrow');
    const expandText = card.querySelector('.expand-text');
    const deleteBtn = card.querySelector('.btn-delete-msg');

    // Botón eliminar mensaje
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openConfirmDialog({
        title: '¿Eliminar este mensaje?',
        desc: 'Esta acción no se puede deshacer y el mensaje se borrará permanentemente.',
        onConfirm: async () => {
          await deleteMessage(msg.id);
        }
      });
    });

    // Expandir / Ocultar correo completo
    header.addEventListener('click', () => {
      const isOpen = bodyExpanded.classList.toggle('open');
      arrow.classList.toggle('open', isOpen);
      expandText.textContent = isOpen ? 'Ocultar correo completo' : 'Ver correo completo';

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
      // Actualizar conteo en sidebar
      if (currentAlias && currentAlias.message_count > 0) {
        currentAlias.message_count--;
        renderSidebarList();
      }
      showToast('Mensaje eliminado permanentemente', 'success');
    } else {
      showToast('Error al eliminar el mensaje', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

// ─── Eliminar Alias ───────────────────────────────────
function confirmDeleteCurrentAlias() {
  if (!currentAlias) return;
  openConfirmDialog({
    title: '¿Eliminar correo temporal?',
    desc: `Se borrará el alias <b>${escapeHtml(currentAlias.email)}</b> y todos los mensajes que recibió. No se podrá recuperar.`,
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/aliases/${encodeURIComponent(currentAlias.email)}`, { method: 'DELETE' });
        if (res.ok) {
          aliases = aliases.filter(a => a.email.toLowerCase() !== currentAlias.email.toLowerCase());
          showToast('Correo temporal eliminado', 'success');
          if (aliases.length > 0) {
            selectAlias(aliases[0].email);
          } else {
            showWelcomeScreen();
          }
        } else {
          showToast('No se pudo eliminar el alias', 'error');
        }
      } catch (e) {
        showToast('Error de conexión', 'error');
      }
    }
  });
}

// ─── Crear Nuevo Alias ────────────────────────────────
async function createNewAlias() {
  const selectedRadio = document.querySelector('input[name="provider"]:checked');
  const mode = selectedRadio ? selectedRadio.value : 'dots';

  btnGenerateModal.disabled = true;
  btnGenerateModal.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';

  try {
    const res = await fetch('/api/aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Error al generar alias', 'error');
      return;
    }

    closeModal(createModal);
    await loadAliases();
    selectAlias(data.email);
    showToast(`Correo generado: ${data.email}`, 'success');
  } catch (err) {
    showToast('Error al conectar con el servidor', 'error');
  } finally {
    btnGenerateModal.disabled = false;
    btnGenerateModal.innerHTML = '<i class="fa-solid fa-bolt"></i> Generar alias aleatorio';
  }
}

// ─── Confirm Dialog Reutilizable ──────────────────────
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

// ─── Helpers: Modal & Toast ───────────────────────────
function openModal(modal) {
  modal.classList.add('open');
}

function closeModal(modal) {
  modal.classList.remove('open');
}

window.copyOtpCode = function(code) {
  navigator.clipboard.writeText(code);
  showToast(`Código ${code} copiado al portapapeles`, 'success');
};

function copyCurrentEmail() {
  if (!currentAlias) return;
  navigator.clipboard.writeText(currentAlias.email);
  copyBtnText.textContent = '¡COPIADO!';
  btnCopyAlias.style.background = '#10b981';
  btnCopyAlias.style.color = '#fff';
  setTimeout(() => {
    copyBtnText.textContent = 'COPIAR';
    btnCopyAlias.style.background = '';
    btnCopyAlias.style.color = '';
  }, 1800);
  showToast(`Copiado: ${currentAlias.email}`, 'success');
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
  // Copiar correo
  btnCopyAlias.addEventListener('click', copyCurrentEmail);

  // Eliminar alias actual
  btnDeleteAlias.addEventListener('click', confirmDeleteCurrentAlias);

  // Abrir modal de creación
  btnCreateBig.addEventListener('click', () => openModal(createModal));
  btnCreateNew.addEventListener('click', () => openModal(createModal));

  // Cerrar modal
  modalClose.addEventListener('click', () => closeModal(createModal));
  createModal.addEventListener('click', (e) => {
    if (e.target === createModal) closeModal(createModal);
  });

  // Generar en modal
  btnGenerateModal.addEventListener('click', createNewAlias);

  // Modal de confirmación
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
