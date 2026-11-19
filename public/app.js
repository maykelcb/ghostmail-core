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
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Silent fallback
    }
  }
}

const audio = new GhostAudio();

// ─── State Management ────────────────────────────────
let currentEmail = localStorage.getItem('ghost_current_email') || '';
let currentBase = '';
let activeMode = localStorage.getItem('ghost_mode') || 'dots';
let messages = [];
let socket = null;

// DOM Elements
const currentEmailDisplay = document.getElementById('currentEmailDisplay');
const baseAccountDisplay = document.getElementById('baseAccountDisplay');
const btnCopyEmail = document.getElementById('btnCopyEmail');
const copyBtnText = document.getElementById('copyBtnText');
const btnGenerateNew = document.getElementById('btnGenerateNew');
const modePills = document.querySelectorAll('.mode-pill');
const messagesFeed = document.getElementById('messagesFeed');
const emptyState = document.getElementById('emptyState');
const messageCountBadge = document.getElementById('messageCountBadge');
const filterCurrentOnly = document.getElementById('filterCurrentOnly');
const poolStatsPill = document.getElementById('poolStatsPill');
const statsAccountCount = document.getElementById('statsAccountCount');
const statsComboCount = document.getElementById('statsComboCount');
const clearInboxBtn = document.getElementById('clearInboxBtn');
const audioToggle = document.getElementById('audioToggle');
const audioIcon = document.getElementById('audioIcon');

// Modal Elements
const messageModal = document.getElementById('messageModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalFrom = document.getElementById('modalFrom');
const modalDate = document.getElementById('modalDate');
const modalSubject = document.getElementById('modalSubject');
const modalTo = document.getElementById('modalTo');
const modalOtpCard = document.getElementById('modalOtpCard');
const modalOtpValue = document.getElementById('modalOtpValue');
const modalBtnCopyOtp = document.getElementById('modalBtnCopyOtp');
const modalBody = document.getElementById('modalBody');

// ─── Initialization ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAudioUI();
  initSocket();
  initEventListeners();
  loadServerStatus();

  // Si ya había un modo guardado, activarlo
  modePills.forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-mode') === activeMode);
  });

  if (!currentEmail) {
    generateNewEmail();
  } else {
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
    // Agregar al inicio
    messages.unshift(email);
    renderMessages();
    audio.playDing();

    // Notificación en Toast
    const otpNotice = email.otp ? ` [CÓDIGO: ${email.otp}]` : '';
    showToast(`Nuevo correo de ${email.from}${otpNotice}`, 'success');
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
    const res = await fetch(`/api/generate?mode=${activeMode}`);
    const data = await res.json();
    if (data.success) {
      currentEmail = data.email;
      currentBase = data.baseAccount;
      localStorage.setItem('ghost_current_email', currentEmail);
      currentEmailDisplay.textContent = currentEmail;
      baseAccountDisplay.textContent = currentBase;

      // Animar actualización
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
    const res = await fetch('/api/status');
    const data = await res.json();
    statsAccountCount.textContent = `${data.activeAccounts} Cuenta(s)`;
    statsComboCount.textContent = `${data.totalCombinations.toLocaleString()} Alias`;
  } catch (e) {
    // Fallback silent
  }
}

async function fetchExistingMessages() {
  try {
    const res = await fetch('/api/messages');
    const data = await res.json();
    if (data.messages) {
      messages = data.messages;
      renderMessages();
    }
  } catch (e) {
    // Fallback
  }
}

// ─── Render Messages Feed ────────────────────────────
function renderMessages() {
  const onlyCurrent = filterCurrentOnly.checked;
  const currentNormalized = currentEmail.replace(/\./g, '').split('+')[0].toLowerCase();

  const filtered = messages.filter(m => {
    if (!onlyCurrent) return true;
    const toNormalized = (m.to || '').replace(/\./g, '').split('+')[0].toLowerCase();
    return (
      (m.to || '').toLowerCase().includes(currentEmail.toLowerCase()) ||
      toNormalized.includes(currentNormalized)
    );
  });

  messageCountBadge.textContent = `${filtered.length} mensaje(s)`;

  if (filtered.length === 0) {
    messagesFeed.innerHTML = '';
    messagesFeed.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  messagesFeed.innerHTML = '';

  filtered.forEach(msg => {
    const card = document.createElement('div');
    card.className = `message-card ${msg.otp ? 'has-otp' : ''}`;

    const dateFormatted = new Date(msg.date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let otpHtml = '';
    if (msg.otp) {
      otpHtml = `
        <div class="otp-spotlight">
          <div class="otp-left">
            <span class="otp-tag-label"><i class="fa-solid fa-key"></i> CÓDIGO DETECTADO:</span>
            <span class="otp-code-value">${msg.otp}</span>
          </div>
          <button class="btn-quick-copy-otp" onclick="copyOtpCode('${msg.otp}')">
            <i class="fa-regular fa-copy"></i>
            <span>Copiar</span>
          </button>
        </div>
      `;
    }

    let actionLinkHtml = '';
    if (msg.actionUrl) {
      actionLinkHtml = `
        <a href="${msg.actionUrl}" target="_blank" rel="noopener noreferrer" class="btn-open-action-link">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
          <span>Confirmar / Abrir Enlace</span>
        </a>
      `;
    }

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

      <p class="message-preview">${escapeHtml(msg.preview || 'Sin vista previa disponible.')}</p>

      <div class="card-bottom-actions">
        <span class="card-target-alias">Para: ${escapeHtml(msg.to)}</span>
        <div style="display:flex; gap:8px;">
          ${actionLinkHtml}
          <button class="btn-view-full" onclick="openMessageDetail('${msg.id}')">
            <i class="fa-regular fa-envelope"></i>
            <span>Ver Correo Completo</span>
          </button>
        </div>
      </div>
    `;

    messagesFeed.appendChild(card);
  });
}

// ─── Modal Detail Viewer ─────────────────────────────
window.openMessageDetail = function(msgId) {
  const msg = messages.find(m => m.id === msgId);
  if (!msg) return;

  modalFrom.textContent = `De: ${msg.from}`;
  modalDate.textContent = new Date(msg.date).toLocaleString();
  modalSubject.textContent = msg.subject;
  modalTo.textContent = `Destinatario: ${msg.to}`;

  if (msg.otp) {
    modalOtpCard.style.display = 'block';
    modalOtpValue.textContent = msg.otp;
    modalBtnCopyOtp.onclick = () => copyOtpCode(msg.otp);
  } else {
    modalOtpCard.style.display = 'none';
  }

  // Si tiene HTML sanitizado o texto plano
  if (msg.html) {
    modalBody.innerHTML = msg.html;
  } else {
    modalBody.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(msg.text)}</pre>`;
  }

  messageModal.classList.add('open');
};

modalCloseBtn.addEventListener('click', () => {
  messageModal.classList.remove('open');
});

messageModal.addEventListener('click', e => {
  if (e.target === messageModal) {
    messageModal.classList.remove('open');
  }
});

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
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  filterCurrentOnly.addEventListener('change', renderMessages);

  clearInboxBtn.addEventListener('click', async () => {
    if (confirm('¿Deseas vaciar la bandeja de entrada local?')) {
      await fetch('/api/messages', { method: 'DELETE' });
    }
  });
}
