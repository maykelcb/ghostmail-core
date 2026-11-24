import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import EventEmitter from 'events';
import { extractOtpAndLinks } from './otpExtractor.js';
import { normalizeEmail } from './aliasGenerator.js';

function extractAddressString(val) {
  if (!val) return '';
  let str = '';
  if (typeof val === 'string') str = val;
  else if (typeof val.text === 'string') str = val.text;
  else if (Array.isArray(val.value) && val.value[0]?.address) return val.value[0].address.toLowerCase();
  else if (typeof val.value === 'string') str = val.value;
  else str = String(val);

  // Extraer dirección entre < > o patrón email
  const match = str.match(/<([^>]+)>/) || str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (match) return match[1].trim().toLowerCase();
  return str.trim().toLowerCase();
}

export class ImapWorkerPool extends EventEmitter {
  constructor(accounts) {
    super();
    this.accounts = accounts || [];
    this.clients = new Map();
    this.pollTimers = new Map();
    this.processedUids = new Set();
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.log(`[IMAP] Iniciando pool con ${this.accounts.length} cuenta(s)...`);

    for (const acc of this.accounts) {
      this.connectAccount(acc);
    }
  }

  async connectAccount(account) {
    if (!this.isRunning) return;

    const email = account.user;
    const isOutlook = email.includes('@outlook.') || email.includes('@hotmail.');
    const host = isOutlook ? 'outlook.office365.com' : 'imap.gmail.com';

    const client = new ImapFlow({
      host,
      port: 993,
      secure: true,
      auth: {
        user: account.user,
        pass: account.pass || account.password
      },
      logger: false,
      emitLogs: false
    });

    this.clients.set(email, client);

    try {
      console.log(`[IMAP] Conectando a ${email} (${host})...`);
      await client.connect();
      console.log(`[IMAP] Conectado exitosamente a ${email}`);
      this.emit('accountConnected', { user: email });

      // Iniciar el listener continuo
      await this.listenInbox(client, account);
    } catch (err) {
      console.error(`[IMAP] Error en cuenta ${email}:`, err.message);
      this.emit('accountError', { user: email, error: err.message });
      // Reintentar en 10 segundos si se cae
      if (this.isRunning) {
        setTimeout(() => this.connectAccount(account), 10000);
      }
    }
  }

  async listenInbox(client, account) {
    let mailboxPath = 'INBOX';
    try {
      // En Gmail, buscar [Gmail]/Todos o mailbox con specialUse \All para capturar Inbox, Categorías y Spam sin demora
      try {
        const list = await client.list();
        const allMailbox = list.find(m => m.specialUse === '\\All') || list.find(m => m.path === '[Gmail]/Todos' || m.path === '[Gmail]/All Mail');
        if (allMailbox) {
          mailboxPath = allMailbox.path;
        }
      } catch (listErr) {
        mailboxPath = 'INBOX';
      }

      console.log(`[IMAP] Seleccionando buzón "${mailboxPath}" para ${account.user}...`);
      const lock = await client.getMailboxLock(mailboxPath);
      console.log(`[IMAP] Escuchando buzón "${mailboxPath}" para ${account.user} con IDLE continuo...`);

      // Cargar los últimos 5 mensajes recientes al conectar
      try {
        const status = await client.status(mailboxPath, { messages: true });
        if (status && status.messages > 0) {
          const startSeq = Math.max(1, status.messages - 4);
          for await (const msg of client.fetch(`${startSeq}:*`, { source: true, envelope: true, uid: true })) {
            await this.parseAndEmitMessage(msg, account);
          }
        }
      } catch (loadErr) {
        console.error(`[IMAP] Error al precargar mensajes:`, loadErr.message);
      }

      // Evento instantáneo de nuevo mensaje vía IMAP PUSH (IDLE)
      client.on('exists', async () => {
        try {
          await this.fetchRecentMessages(client, mailboxPath, account);
        } catch (e) {
          console.error(`[IMAP] Error al procesar mensaje en ${account.user}:`, e.message);
        }
      });

      // Polling activo de respaldo cada 3.5 segundos para garantizar que NUNCA haya retrasos
      if (this.pollTimers.has(account.user)) {
        clearInterval(this.pollTimers.get(account.user));
      }
      const pollInterval = setInterval(async () => {
        if (!this.isRunning || !client.usable) {
          clearInterval(pollInterval);
          return;
        }
        try {
          await this.fetchRecentMessages(client, mailboxPath, account);
        } catch (pollErr) {
          // Ignorar errores temporales de red durante poll
        }
      }, 3500);
      this.pollTimers.set(account.user, pollInterval);

      // Bucle de IDLE continuo para mantener la conexión viva indefinidamente
      try {
        while (this.isRunning && client.usable) {
          try {
            await client.idle();
          } catch (idleErr) {
            if (!this.isRunning) break;
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      } finally {
        lock.release();
        if (this.pollTimers.has(account.user)) {
          clearInterval(this.pollTimers.get(account.user));
          this.pollTimers.delete(account.user);
        }
      }
    } catch (err) {
      console.error(`[IMAP] Conexión interrumpida en ${account.user}:`, err.message);
      if (this.isRunning) {
        setTimeout(() => this.connectAccount(account), 8000);
      }
    }
  }

  async fetchRecentMessages(client, mailboxPath, account) {
    try {
      const status = await client.status(mailboxPath, { messages: true });
      if (!status || status.messages <= 0) return;

      const startSeq = Math.max(1, status.messages - 3);
      for await (const msg of client.fetch(`${startSeq}:*`, { source: true, envelope: true, uid: true })) {
        await this.parseAndEmitMessage(msg, account);
      }
    } catch (err) {
      // Ignorar errores silenciosos en lecturas concurrentes
    }
  }

  async parseAndEmitMessage(message, account) {
    if (!message || !message.source) return;

    const uidKey = `${account.user}_${message.uid || message.id || ''}`;
    if (message.uid && this.processedUids.has(uidKey)) {
      return; // Ya procesado, no repetir
    }

    try {
      const parsed = await simpleParser(message.source);

      // Guardar en la caché de UIDs procesados (máx 500 para evitar fugas de memoria)
      if (message.uid) {
        this.processedUids.add(uidKey);
        if (this.processedUids.size > 500) {
          const firstKey = this.processedUids.values().next().value;
          this.processedUids.delete(firstKey);
        }
      }

      // Determinar a quién iba dirigido (para mapear al alias exacto)
      const deliveredToRaw = parsed.headers.get('delivered-to');
      const deliveredTo = extractAddressString(deliveredToRaw);
      const recipientTo = extractAddressString(parsed.to);
      const fullRecipient = (deliveredTo || recipientTo || account.user).toLowerCase();

      const subject = parsed.subject || '(Sin Asunto)';
      const fromText = parsed.from?.text || 'Desconocido';
      const textBody = parsed.text || '';
      const htmlBody = parsed.html || '';

      const { otp, actionUrl, preview } = extractOtpAndLinks(textBody, htmlBody, subject);

      const emailEvent = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        uid: message.uid ? String(message.uid) : null,
        from: fromText,
        to: fullRecipient,
        normalizedTo: normalizeEmail(fullRecipient),
        subject,
        date: parsed.date || new Date(),
        text: textBody,
        html: htmlBody,
        otp,
        actionUrl,
        preview,
        baseAccount: account.user
      };

      console.log(`[IMAP] Mensaje procesado para [${fullRecipient}] | Asunto: "${subject}" | OTP: ${otp || 'N/A'}`);
      this.emit('message', emailEvent);
    } catch (err) {
      console.error(`[IMAP] Fallo al parsear correo:`, err.message);
    }
  }

  async stop() {
    this.isRunning = false;
    for (const timer of this.pollTimers.values()) {
      clearInterval(timer);
    }
    this.pollTimers.clear();

    for (const [user, client] of this.clients.entries()) {
      try {
        await client.logout();
        console.log(`[IMAP] Desconectado: ${user}`);
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }
    this.clients.clear();
  }
}
