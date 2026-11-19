import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { generateFromPool, calculateCombinations, normalizeEmail } from './aliasGenerator.js';
import { ImapWorkerPool } from './imapWorker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Parsear cuentas de Gmail desde .env
let accounts = [];
try {
  accounts = JSON.parse(process.env.GMAIL_ACCOUNTS || '[]');
} catch (e) {
  console.error('[SERVER] Error al parsear GMAIL_ACCOUNTS en .env:', e.message);
}

if (accounts.length === 0) {
  console.warn('[SERVER] ADVERTENCIA: No se configuraron cuentas de Gmail en el archivo .env');
}

// Almacenamiento en memoria para mensajes recientes (máximo 150)
const memoryMessages = [];

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar el Pool IMAP
const imapPool = new ImapWorkerPool(accounts);

imapPool.on('message', emailData => {
  // Guardar en memoria (al inicio de la lista)
  memoryMessages.unshift(emailData);
  if (memoryMessages.length > 150) {
    memoryMessages.pop();
  }

  // Notificar por WebSocket a todos los clientes conectados
  io.emit('email_received', emailData);
});

// REST API Endpoints
app.get('/api/status', (req, res) => {
  let totalCombos = 0;
  for (const acc of accounts) {
    const user = acc.user.split('@')[0];
    const { totalWithGooglemail } = calculateCombinations(user);
    totalCombos += totalWithGooglemail;
  }

  res.json({
    activeAccounts: accounts.length,
    accountUsers: accounts.map(a => a.user),
    totalCombinations: totalCombos,
    storedMessagesCount: memoryMessages.length,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.get('/api/generate', (req, res) => {
  try {
    const mode = req.query.mode || 'dots'; // dots, googlemail, plus
    const tag = req.query.tag || null;
    const result = generateFromPool(accounts, mode, { tag });
    res.json({
      success: true,
      email: result.alias,
      baseAccount: result.baseAccount,
      normalized: result.normalized,
      mode
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/messages', (req, res) => {
  const targetAddress = req.query.address;
  if (!targetAddress) {
    return res.json({ messages: memoryMessages });
  }

  const normalizedTarget = normalizeEmail(targetAddress);
  const filtered = memoryMessages.filter(msg => {
    return (
      msg.to.toLowerCase().includes(targetAddress.toLowerCase()) ||
      msg.normalizedTo === normalizedTarget
    );
  });

  res.json({ messages: filtered });
});

app.delete('/api/messages', (req, res) => {
  memoryMessages.length = 0;
  io.emit('messages_cleared');
  res.json({ success: true, message: 'Bandeja vaciada con éxito.' });
});

// Conexión WebSockets
io.on('connection', socket => {
  console.log(`[SOCKET] Cliente conectado: ${socket.id}`);

  // Enviar estado inicial y mensajes existentes
  socket.emit('initial_state', {
    storedMessages: memoryMessages
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar servidor e IMAP
server.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(` GHOSTMAIL CORE — SERVIDOR INICIADO EN PUERTO ${PORT}`);
  console.log(` Accede localmente en: http://localhost:${PORT}`);
  console.log(`=======================================================`);

  if (accounts.length > 0) {
    await imapPool.start();
  }
});

// Cierre elegante
process.on('SIGINT', async () => {
  console.log('\n[SERVER] Deteniendo servidor y cerrando sesiones IMAP...');
  await imapPool.stop();
  process.exit(0);
});
