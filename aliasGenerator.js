/**
 * GhostMail - Alias Generator Engine
 * Generates dot-matrix permutations, googlemail variants, and plus-addressing aliases.
 */

export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const cleaned = email.trim().toLowerCase();
  const [localPart, domainPart] = cleaned.split('@');
  if (!domainPart) return cleaned;

  // Normalizar si es dominio de Google
  if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
    const noPlus = localPart.split('+')[0];
    const noDots = noPlus.replace(/\./g, '');
    return `${noDots}@gmail.com`;
  }

  // Normalizar si es Outlook
  if (domainPart.includes('outlook.') || domainPart.includes('hotmail.')) {
    const noPlus = localPart.split('+')[0];
    return `${noPlus}@${domainPart}`;
  }

  return cleaned;
}

/**
 * Calcula las combinaciones exactas de puntos posibles para un usuario.
 */
export function calculateCombinations(username) {
  const cleanUser = username.replace(/\./g, '').split('+')[0];
  const gaps = cleanUser.length - 1;
  const dotCombos = Math.pow(2, Math.max(0, gaps));
  return {
    dotCombinations: dotCombos,
    totalWithGooglemail: dotCombos * 2
  };
}

/**
 * Genera una permutación aleatoria con puntos.
 */
export function generateDotAlias(username, options = {}) {
  const cleanUser = username.replace(/\./g, '').split('+')[0];
  const n = cleanUser.length;
  if (n <= 1) return cleanUser;

  const gaps = n - 1;
  const maxMask = Math.pow(2, gaps) - 1;
  const mask = Math.floor(Math.random() * maxMask) + 1;

  let result = cleanUser[0];
  for (let i = 0; i < gaps; i++) {
    if ((mask >> i) & 1) {
      result += '.';
    }
    result += cleanUser[i + 1];
  }

  const useGooglemail = options.useGooglemail ?? (Math.random() > 0.5);
  const domain = useGooglemail ? 'googlemail.com' : 'gmail.com';

  return `${result}@${domain}`;
}

/**
 * Genera un alias con '+' (Plus Addressing).
 */
export function generatePlusAlias(username, domain = 'gmail.com', customTag = null) {
  const cleanUser = username.replace(/\./g, '').split('+')[0];
  const tag = customTag || Math.random().toString(36).substring(2, 7);
  return `${cleanUser}+${tag}@${domain}`;
}

/**
 * Generador maestro a partir de un pool de cuentas.
 */
export function generateFromPool(accounts, mode = 'dots', customOptions = {}) {
  if (!accounts || accounts.length === 0) {
    throw new Error('No hay cuentas configuradas en el servidor.');
  }

  // Si el usuario pidió Outlook
  if (mode === 'outlook') {
    const outlookAccounts = accounts.filter(a => a.user.includes('@outlook.') || a.user.includes('@hotmail.'));
    if (!outlookAccounts.length) {
      throw new Error('No hay cuentas de Outlook configuradas en el servidor. Por favor configura una cuenta @outlook.com en .env.');
    }
    const baseAccount = outlookAccounts[Math.floor(Math.random() * outlookAccounts.length)];
    const [userPart, domainPart] = baseAccount.user.split('@');
    const alias = generatePlusAlias(userPart, domainPart, customOptions.tag);
    return {
      alias,
      baseAccount: baseAccount.user,
      normalized: normalizeEmail(alias)
    };
  }

  // Cuentas de Google (Gmail / Googlemail)
  const googleAccounts = accounts.filter(a => !a.user.includes('@outlook.') && !a.user.includes('@hotmail.'));
  const pool = googleAccounts.length > 0 ? googleAccounts : accounts;
  const baseAccount = pool[Math.floor(Math.random() * pool.length)];
  const cleanUsername = baseAccount.user.split('@')[0];

  let generated = '';
  if (mode === 'plus') {
    generated = generatePlusAlias(cleanUsername, 'gmail.com', customOptions.tag);
  } else if (mode === 'googlemail') {
    generated = generateDotAlias(cleanUsername, { useGooglemail: true });
  } else {
    // Por defecto: 'dots'
    generated = generateDotAlias(cleanUsername, { useGooglemail: false });
  }

  return {
    alias: generated,
    baseAccount: baseAccount.user,
    normalized: normalizeEmail(generated)
  };
}

/**
 * Función unificada para server.js
 */
export function generateAlias(accounts, mode = 'dots') {
  const result = generateFromPool(accounts, mode);
  return {
    email: result.alias,
    baseAccount: result.baseAccount
  };
}
