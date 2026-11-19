import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import EventEmitter from 'events';
import { extractOtpAndLinks } from './otpExtractor.js';
import { normalizeEmail } from './aliasGenerator.js';

function extractAddressString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val.text === 'string') return val.text;
  if (Array.isArray(val.value) && val.value[0]?.address) return val.value[0].address;
  if (typeof val.value === 'string') return val.value;
  return String(val);
}

export class ImapWorkerPool extends EventEmitter {
  constructor(accounts) {
    super();
    this.accounts = accounts || [];
    this.clients = new Map();
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
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: account.user,
        pass: account.pass
      },
      logger: false,
      emitLogs: false
    });

    this.clients.set(email, client);

    try {
      console.log(`[IMAP] Conectando a ${email}...`);
      await client.connect();
      console.log(`[IMAP] Conectado exitosamente a ${email}`);
      this.emit('accountConnected', { user: email });

      // Iniciar el listener en INBOX
      await this.listenInbox(client, account);
    } catch (err) {
      console.error(`[IMAP] Error en cuenta ${email}:`, err.message);
      this.emit('accountError', { user: email, error: err.message });
      // Reintentar en 15 segundos si se cae
      if (this.isRunning) {
        setTimeout(() => this.connectAccount(account), 15000);
      }
    }
  }

  async listenInbox(client, account) {
    try {
      const lock = await client.getMailboxLock('INBOX');
      console.log(`[IMAP] Escuchando buzón INBOX para ${account.user} con IDLE...`);

      // Cargar los últimos 5 mensajes recientes al conectar
      try {
        const status = await client.status('INBOX', { messages: true });
        if (status && status.messages > 0) {
          const startSeq = Math.max(1, status.messages - 4);
          for await (const msg of client.fetch(`${startSeq}:*`, { source: true, envelope: true })) {
            await this.parseAndEmitMessage(msg, account);
          }
        }
      } catch (loadErr) {
        console.error(`[IMAP] Error al precargar mensajes:`, loadErr.message);
      }

      // Evento de nuevo mensaje
      client.on('exists', async data => {
        try {
          await this.processLatestMessage(client, account);
        } catch (e) {
          console.error(`[IMAP] Error al procesar mensaje en ${account.user}:`, e.message);
        }
      });

      // Mantener IDLE activo
      await client.idle();
      lock.release();
    } catch (err) {
      console.error(`[IMAP] Conexión interrumpida en ${account.user}:`, err.message);
      if (this.isRunning) {
        setTimeout(() => this.connectAccount(account), 10000);
      }
    }
  }

  async parseAndEmitMessage(message, account) {
    if (!message || !message.source) return;
    try {
      const parsed = await simpleParser(message.source);

      // Determinar a quién iba dirigido (para mapear al alias exacto)
      const deliveredToRaw = parsed.headers.get('delivered-to');
      const deliveredTo = extractAddressString(deliveredToRaw);
      const recipientTo = extractAddressString(parsed.to);
      const fullRecipient = deliveredTo || recipientTo || account.user;

      const subject = parsed.subject || '(Sin Asunto)';
      const fromText = parsed.from?.text || 'Desconocido';
      const textBody = parsed.text || '';
      const htmlBody = parsed.html || '';

      const { otp, actionUrl, preview } = extractOtpAndLinks(textBody, htmlBody, subject);

      const emailEvent = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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

  async processLatestMessage(client, account) {
    try {
      // Buscar el último mensaje no leído o más reciente
      const message = await client.fetchOne('*', { source: true, envelope: true });
      await this.parseAndEmitMessage(message, account);
    } catch (err) {
      console.error(`[IMAP] Error al obtener último mensaje:`, err.message);
    }
  }

  async stop() {
    this.isRunning = false;
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
