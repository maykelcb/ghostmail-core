/**
 * GhostMail - Alias Generator Engine
 * Generates dot-matrix permutations, googlemail variants, and plus-addressing aliases.
 */

export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const cleaned = email.trim().toLowerCase();
  const [localPart, domainPart] = cleaned.split('@');
  if (!domainPart) return cleaned;

  // Solo normalizar si es dominio de Google
  if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
    // Quitar todo lo que va después del signo '+'
    const noPlus = localPart.split('+')[0];
    // Quitar todos los puntos
    const noDots = noPlus.replace(/\./g, '');
    return `${noDots}@gmail.com`;
  }

  return cleaned;
}

/**
 * Calcula las combinaciones exactas de puntos posibles para un usuario.
 */
export function calculateCombinations(username) {
  const cleanUser = username.replace(/\./g, '').split('+')[0];
  const gaps = cleanUser.length - 1;
  const dotCombos = Math.pow(2, gaps);
  // Multiplicado por 2 por el soporte de @googlemail.com
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

  // Decidir dónde colocar puntos aleatoriamente (al menos 1 punto garantizado si requested)
  const gaps = n - 1;
  // Elegir una máscara aleatoria entre 1 y (2^gaps - 1)
  const maxMask = Math.pow(2, gaps) - 1;
  const mask = Math.floor(Math.random() * maxMask) + 1;

  let result = cleanUser[0];
  for (let i = 0; i < gaps; i++) {
    // Si el bit i está activo, insertamos un punto
    if ((mask >> i) & 1) {
      result += '.';
    }
    result += cleanUser[i + 1];
  }

  // Título de dominio (@gmail.com o @googlemail.com)
  const useGooglemail = options.useGooglemail ?? (Math.random() > 0.5);
  const domain = useGooglemail ? 'googlemail.com' : 'gmail.com';

  return `${result}@${domain}`;
}

/**
 * Genera un alias con '+' (Plus Addressing).
 */
export function generatePlusAlias(username, customTag = null) {
  const cleanUser = username.replace(/\./g, '').split('+')[0];
  const tag = customTag || Math.random().toString(36).substring(2, 7);
  return `${cleanUser}+${tag}@gmail.com`;
}

/**
 * Generador maestro a partir de un pool de cuentas.
 */
export function generateFromPool(accounts, mode = 'dots', customOptions = {}) {
  if (!accounts || accounts.length === 0) {
    throw new Error('No hay cuentas configuradas en el pool.');
  }

  // Elegir una cuenta base aleatoria del pool
  const baseAccount = accounts[Math.floor(Math.random() * accounts.length)];
  const cleanUsername = baseAccount.user.split('@')[0];

  let generated = '';
  if (mode === 'plus') {
    generated = generatePlusAlias(cleanUsername, customOptions.tag);
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
