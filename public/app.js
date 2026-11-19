/**
 * GhostMail Core — Frontend Controller & WebSocket Client
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

// ─── State Management ────────────────────────────────
let currentEmail = localStorage.getItem('ghost_current_email') || '';
let currentNormalized = '';   // base sin puntos ni +, minúscula
let currentBase = '';
let activeMode = localStorage.getItem('ghost_mode') || 'dots';
let messages = [];
let socket = null;

// DOM Elements
const currentEmailDisplay = document.getElementById('currentEmailDisplay');
const baseAccountDisplay  = document.getElementById('baseAccountDisplay');
const btnCopyEmail        = document.getElementById('btnCopyEmail');
const copyBtnText         = document.getElementById('copyBtnText');
const btnGenerateNew      = document.getElementById('btnGenerateNew');
const modePills           = document.querySelectorAll('.mode-pill');
const messagesFeed        = document.getElementById('messagesFeed');
const emptyState          = document.getElementById('emptyState');
const messageCountBadge   = document.getElementById('messageCountBadge');
const statsAccountCount   = document.getElementById('statsAccountCount');
const statsComboCount     = document.getElementById('statsComboCount');
const clearInboxBtn       = document.getElementById('clearInboxBtn');
const audioToggle         = document.getElementById('audioToggle');
const audioIcon           = document.getElementById('audioIcon');

// ─── Helpers ─────────────────────────────────────────
function normalizeLocal(email) {
  if (!email) return '';
  return email.toLowerCase().split('@')[0].replace(/\./g, '').split('+')[0];
}

function getRecipientString(to) {
  if (!to) return '';
  if (typeof to === 'string') return to;
  if (to.text && typeof to.text === 'string') return to.text;
  if (Array.isArray(to.value) && to.value[0]?.address) return to.value[0].address;
  if (to.value && typeof to.value === 'string') return to.value;
  return String(to);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** ¿El mensaje llegó a la cuenta activa actual? */
function belongsToCurrentEmail(msg) {
  if (!currentNormalized) return true;
  const toStr  = getRecipientString(msg.to).toLowerCase();
  const toClean = normalizeLocal(toStr);
  const baseClean = normalizeLocal(msg.baseAccount || '');
  return (
    toClean === currentNormalized ||
    (msg.normalizedTo && normalizeLocal(msg.normalizedTo) === currentNormalized) ||
    (baseClean && baseClean === currentNormalized)
  );
}

// ─── Initialization ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAudioUI();
  initSocket();
  initEventListeners();
  loadServerStatus();

  modePills.forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-mode') === activeMode);
  });

  if (!currentEmail) {
    generateNewEmail();
  } else {
    currentNormalized = normalizeLocal(currentEmail);
    currentEmailDisplay.textContent = currentEmail;
    fetchExistingMessages();
  }
});

// ─── Audio Toggle UI ─────────────────────────────────
function initAudioUI() {
  updateAudioIcon();
  audioToggle.addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    localStorage.setItem('ghost_audio', audio.enabled ? 'true' : 'false');
    updateAudioIcon();
    showToast(audio.enabled ? 'Notificaciones de audio activadas' : 'Audio silenciado', 'info');
  });
}

function updateAudioIcon() {
  if (audio.enabled) {
    audioIcon.className = 'fa-solid fa-volume-high';
    audioToggle.style.color = 'var(--accent-emerald)';
  } else {
    audioIcon.className = 'fa-solid fa-volume-xmark';
    audioToggle.style.color = 'var(--text-muted)';
  }
}

// ─── WebSocket Engine ────────────────────────────────
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    document.getElementById('imapStatusText').textContent = 'IMAP: ESCUCHANDO';
  });

  socket.on('disconnect', () => {
    document.getElementById('imapStatusText').textContent = 'IMAP: RECONECTANDO...';
  });

  socket.on('initial_state', data => {
    if (data.storedMessages && data.storedMessages.length > 0) {
      messages = data.storedMessages;
      renderMessages();
    }
  });

  socket.on('email_received', email => {
    messages.unshift(email);
    renderMessages();
    if (belongsToCurrentEmail(email)) {
      audio.playDing();
      const otpNotice = email.otp ? ` · Código: ${email.otp}` : '';
      showToast(`Nuevo correo de ${email.from}${otpNotice}`, 'success');
    }
  });

  socket.on('messages_cleared', () => {
    messages = [];
    renderMessages();
    showToast('Bandeja vaciada', 'info');
  });
}

// ─── Generate & Fetch ────────────────────────────────
async function generateNewEmail() {
  btnGenerateNew.classList.add('rotating');
  try {
    const res  = await fetch(`/api/generate?mode=${activeMode}`);
    const data = await res.json();
    if (data.success) {
      currentEmail      = data.email;
      currentNormalized = normalizeLocal(currentEmail);
      currentBase       = data.baseAccount;
      localStorage.setItem('ghost_current_email', currentEmail);
      currentEmailDisplay.textContent = currentEmail;
      if (baseAccountDisplay) baseAccountDisplay.textContent = currentBase;

      currentEmailDisplay.style.opacity = '0.3';
      setTimeout(() => (currentEmailDisplay.style.opacity = '1'), 150);

      renderMessages();
    }
  } catch (err) {
    showToast('Error al generar correo', 'error');
  } finally {
    setTimeout(() => btnGenerateNew.classList.remove('rotating'), 400);
  }
}

async function loadServerStatus() {
  try {
    const res  = await fetch('/api/status');
    const data = await res.json();
    statsAccountCount.textContent = `${data.activeAccounts} Cuenta(s)`;
    statsComboCount.textContent   = `${data.totalCombinations.toLocaleString()} Alias`;
  } catch (e) {}
}

async function fetchExistingMessages() {
  try {
    const res  = await fetch('/api/messages');
    const data = await res.json();
    if (data.messages) {
      messages = data.messages;
      renderMessages();
    }
  } catch (e) {}
}

// ─── Render Messages Feed ────────────────────────────
function renderMessages() {
  // Filtro estricto: solo mensajes del alias activo actual
  const filtered = messages.filter(belongsToCurrentEmail);

  messageCountBadge.textContent = `${filtered.length} mensaje(s)`;

  if (filtered.length === 0) {
    messagesFeed.innerHTML = '';
    messagesFeed.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  messagesFeed.innerHTML   = '';

  filtered.forEach(msg => {
    const card = document.createElement('div');
    card.className = `message-card ${msg.otp ? 'has-otp' : ''}`;

    const dateFormatted = new Date(msg.date).toLocaleString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Banner OTP si se detectó código
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

    // Botón de enlace de acción si lo hay
    let actionLinkHtml = '';
    if (msg.actionUrl) {
      actionLinkHtml = `
        <a href="${escapeHtml(msg.actionUrl)}" target="_blank" rel="noopener noreferrer" class="btn-open-action-link">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
          <span>Confirmar / Abrir Enlace</span>
        </a>`;
    }

    // Cuerpo del correo: HTML completo dentro de iframe aislado, o texto plano
    const bodyContent = msg.html
      ? `<iframe class="email-iframe" srcdoc="${escapeAttr(msg.html)}" sandbox="allow-same-origin" scrolling="auto"></iframe>`
      : `<div class="email-plain">${escapeHtml(msg.text || '')}</div>`;

    card.innerHTML = `
      <div class="message-card-top">
        <div class="sender-pill">
          <i class="fa-solid fa-circle-user"></i>
          <span>${escapeHtml(msg.from)}</span>
        </div>
        <span class="date-stamp">${dateFormatted}</span>
      </div>

      <h3 class="message-subject">${escapeHtml(msg.subject)}</h3>

      ${otpHtml}

      <div class="email-body-wrapper">
        ${bodyContent}
      </div>

      ${actionLinkHtml ? `<div class="card-action-row">${actionLinkHtml}</div>` : ''}
    `;

    // Ajustar altura del iframe tras cargar su contenido
    const iframe = card.querySelector('.email-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        try {
          const h = iframe.contentDocument?.body?.scrollHeight;
          if (h) iframe.style.height = (h + 24) + 'px';
        } catch (e) {}
      });
    }

    messagesFeed.appendChild(card);
  });
}

// ─── Helpers: Copy & Toast ───────────────────────────
window.copyOtpCode = function(code) {
  navigator.clipboard.writeText(code);
  showToast(`Código ${code} copiado al portapapeles`, 'success');
};

function copyCurrentEmail() {
  if (!currentEmail) return;
  navigator.clipboard.writeText(currentEmail);
  copyBtnText.textContent = '¡COPIADO!';
  btnCopyEmail.style.background = '#34d399';
  setTimeout(() => {
    copyBtnText.textContent = 'COPIAR';
    btnCopyEmail.style.background = '';
  }, 1800);
  showToast(`Correo copiado: ${currentEmail}`, 'success');
}

function showToast(text, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${text}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/** Escapa el HTML para usarlo dentro del atributo srcdoc del iframe */
function escapeAttr(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Event Listeners ─────────────────────────────────
function initEventListeners() {
  btnCopyEmail.addEventListener('click', copyCurrentEmail);
  btnGenerateNew.addEventListener('click', generateNewEmail);

  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeMode = pill.getAttribute('data-mode');
      localStorage.setItem('ghost_mode', activeMode);
      generateNewEmail();
    });
  });

  clearInboxBtn.addEventListener('click', async () => {
    if (confirm('¿Deseas vaciar la bandeja de entrada local?')) {
      await fetch('/api/messages', { method: 'DELETE' });
    }
  });
}
