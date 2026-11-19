<div align="center">

# 👻 GhostMail Core

**Generador de alias de Gmail desechables con bandeja en tiempo real**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/maykelcb/ghostmail-core?style=flat-square)](https://github.com/maykelcb/ghostmail-core/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/maykelcb/ghostmail-core?style=flat-square)](https://github.com/maykelcb/ghostmail-core/network)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/maykelcb/ghostmail-core/pulls)

*Genera alias únicos desde tus propias cuentas Gmail · Recibe correos en tiempo real · Detecta códigos OTP automáticamente*

</div>

---

## ✨ ¿Qué es GhostMail Core?

GhostMail Core aprovecha el **truco de puntos de Gmail** para generar miles de direcciones de correo únicas a partir de una sola cuenta. Todos los correos enviados a cualquier variante llegan a la misma bandeja — y GhostMail los muestra en tiempo real, separados por alias.

> **Ejemplo:** Si tu cuenta es `usuario@gmail.com`, entonces `u.suario@gmail.com`, `us.uario@gmail.com`, `usuario+trabajo@gmail.com` etc. son todos alias válidos que llegan a tu bandeja original.

### ¿Por qué usarlo?

- 🔒 **Privacidad** — Regístrate en servicios sin exponer tu correo real
- 🚀 **Tiempo real** — Los correos aparecen al instante vía IMAP IDLE + WebSocket
- 🔑 **OTP automático** — Detecta y resalta códigos de verificación automáticamente
- 🆓 **100% gratuito** — Sin APIs de pago, sin límites externos, todo corre en tu máquina
- 🌐 **Open source** — MIT License, haz lo que quieras con él

---

## 🧮 ¿Cuántos alias genera?

| Cuenta | Caracteres | Alias por puntos | + googlemail.com | Total |
|--------|-----------|-----------------|-------------------|-------|
| `usuario@gmail.com` | 7 | 2⁶ = 64 | ×2 | **128** |
| `miusuario@gmail.com` | 10 | 2⁹ = 512 | ×2 | **1,024** |
| `pruebamb987654@gmail.com` | 13 | 2¹² = 4,096 | ×2 | **8,192** |

Además de los alias `+etiqueta` (prácticamente infinitos).

---

## 🖥️ Demo

```
Alias activo:  p.r.uebamb987654@gmail.com

┌─────────────────────────────────────────────────────┐
│  📧  OpusClip <noreply@opus.pro>          12:34 PM  │
│  Tu código de verificación                           │
│  ┌──────────────────────────────────┐               │
│  │  🔑 CÓDIGO DETECTADO:  213519   │  [Copiar]      │
│  └──────────────────────────────────┘               │
│  ┌──────────────────────────────────────────────┐   │
│  │  <Correo HTML renderizado completo aquí>     │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Instalación rápida

### Requisitos
- [Node.js 18+](https://nodejs.org/en/download)
- Una o más cuentas Gmail con **Verificación en 2 pasos activada**

### 1. Clona el repositorio

```bash
git clone https://github.com/maykelcb/ghostmail-core.git
cd ghostmail-core
```

### 2. Instala dependencias

```bash
npm install
```

### 3. Configura tus cuentas Gmail

```bash
cp .env.example .env
```

Edita `.env` con tus datos:

```env
PORT=3000
GMAIL_ACCOUNTS=[
  {
    "user": "tucuenta@gmail.com",
    "password": "xxxx xxxx xxxx xxxx"
  }
]
```

> **¿Qué es esa contraseña?** No es tu contraseña normal de Gmail — es una **contraseña de aplicación**. Mira cómo obtenerla abajo ↓

### 4. Inicia el servidor

```bash
node server.js
```

Abre tu navegador en **http://localhost:3000** 🎉

---

## 🔑 Cómo obtener una Contraseña de Aplicación de Gmail

Las contraseñas de aplicación son códigos de 16 caracteres que permiten que apps externas accedan a tu Gmail de forma segura sin usar tu contraseña real.

1. Ve a [myaccount.google.com/security](https://myaccount.google.com/security)
2. Activa la **Verificación en 2 pasos** (obligatorio)
3. Busca **"Contraseñas de aplicaciones"** en el mismo menú de seguridad
4. Selecciona `Correo` → `Otro (nombre personalizado)` → escribe `GhostMail`
5. Copia el código de 16 caracteres generado (con o sin espacios, funciona igual)

---

## ➕ Agregar más cuentas Gmail

Edita `GMAIL_ACCOUNTS` en `.env` con un array JSON:

```env
GMAIL_ACCOUNTS=[
  {"user": "cuenta1@gmail.com", "password": "xxxx xxxx xxxx xxxx"},
  {"user": "cuenta2@gmail.com", "password": "xxxx xxxx xxxx xxxx"},
  {"user": "cuenta3@googlemail.com", "password": "xxxx xxxx xxxx xxxx"}
]
```

Cada cuenta adicional multiplica el número de alias disponibles. Con 5 cuentas de 13 caracteres → **+40,000 alias únicos**.

---

## 📡 API REST

El servidor expone una API simple:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/status` | Estado del servidor y estadísticas |
| `GET` | `/api/generate?mode=dots` | Genera un alias aleatorio |
| `GET` | `/api/messages` | Todos los mensajes en memoria |
| `DELETE` | `/api/messages` | Limpia la bandeja en memoria |

### Modos de generación (`mode`)

| Modo | Ejemplo |
|------|---------|
| `dots` | `u.suar.io@gmail.com` |
| `googlemail` | `usuario@googlemail.com` |
| `plus` | `usuario+a7x2k@gmail.com` |

---

## 🛠️ Stack técnico

| Componente | Tecnología |
|-----------|-----------|
| Backend | Node.js + Express |
| WebSocket | Socket.io |
| IMAP push | imapflow (IDLE) |
| Parsing de correos | mailparser |
| Frontend | HTML + CSS + JS vanilla |
| Estilos | Dark UI glassmorphism |

---

## 📁 Estructura del proyecto

```
ghostmail-core/
├── server.js           # Servidor Express + Socket.io + lógica principal
├── imapWorker.js       # Pool de conexiones IMAP IDLE con auto-reconexión
├── aliasGenerator.js   # Motor de generación de alias (puntos, googlemail, plus)
├── otpExtractor.js     # Extractor heurístico de códigos OTP y links de acción
├── public/
│   ├── index.html      # Interfaz de usuario
│   ├── style.css       # Estilos dark UI
│   └── app.js          # Controlador frontend + cliente WebSocket
├── .env.example        # Plantilla de configuración
├── .gitignore          # Excluye .env y node_modules
└── package.json
```

---

## ⚠️ Aviso importante

- **Solo usa cuentas que sean tuyas** — No uses esto para acceder a correos ajenos
- El archivo `.env` contiene tus credenciales y está en `.gitignore` — nunca lo compartas ni lo subas a Git
- Este proyecto es para uso personal, privacidad y desarrollo — úsalo de forma responsable

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si tienes ideas para mejorar el proyecto:

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/mi-mejora`
3. Haz tus cambios y un commit: `git commit -m "Agrega mi mejora"`
4. Push: `git push origin feature/mi-mejora`
5. Abre un Pull Request

### Ideas para contribuir
- [ ] Soporte para Outlook/Hotmail aliases
- [ ] Exportar mensajes a JSON/CSV
- [ ] Notificaciones del sistema (desktop notifications)
- [ ] Deploy con Docker
- [ ] Interfaz para gestionar múltiples alias simultáneamente

---

## 📄 Licencia

MIT © [Maykel Bernaola](https://github.com/maykelcb) — Libre para usar, modificar y distribuir.

---

<div align="center">

Hecho con ❤️ para la comunidad open source

⭐ Si te fue útil, dale una estrella al repo

</div>
