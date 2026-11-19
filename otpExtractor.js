/**
 * GhostMail - OTP & Verification Link Extractor Engine
 * Uses heuristics and multi-language Regex patterns to capture OTPs and confirm links.
 */

export function extractOtpAndLinks(text = '', html = '', subject = '') {
  const combined = `${subject}\n${text}`;
  
  // 1. Detectar códigos OTP
  let otpCode = null;

  // Patrones contextuales comunes (español e inglés)
  const contextPatterns = [
    /(?:c[oó]digo|code|c[oó]digo de verificaci[oó]n|verification code|security code|clave|otp|pin|token)[\s:=—\-]+([0-9]{4,8})\b/i,
    /(?:tu c[oó]digo es|your code is|enter code|ingresa el c[oó]digo)[\s:=—\-]+([0-9]{4,8})\b/i,
    /\b([0-9]{3}[-\s][0-9]{3})\b/, // formato 123-456 o 123 456
    /\b([0-9]{4,8})\b/ // números independientes de 4 a 8 dígitos
  ];

  for (const pattern of contextPatterns) {
    const match = combined.match(pattern);
    if (match && match[1]) {
      // Limpiar guiones o espacios en caso de 123-456
      const candidate = match[1].replace(/[-\s]/g, '');
      // Evitar que capture años como 2024, 2025, 2026 a menos que esté en contexto
      if (!['2024', '2025', '2026', '2027'].includes(candidate) || pattern.source.includes('c[oó]digo')) {
        otpCode = candidate;
        break;
      }
    }
  }

  // 2. Detectar enlaces de verificación/activación
  let verificationLink = null;
  const linkMatches = (html || text).match(/https?:\/\/[^\s"'<>]+/gi) || [];
  
  for (const url of linkMatches) {
    const lower = url.toLowerCase();
    if (
      lower.includes('verify') ||
      lower.includes('confirm') ||
      lower.includes('activate') ||
      lower.includes('validate') ||
      lower.includes('token=') ||
      lower.includes('verificacion') ||
      lower.includes('confirmar')
    ) {
      // Limpiar caracteres finales comunes como puntos o comas
      verificationLink = url.replace(/[.,;)]+$/, '');
      break;
    }
  }

  // 3. Generar extracto o preview
  const preview = (text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

  return {
    otp: otpCode,
    actionUrl: verificationLink,
    preview
  };
}
