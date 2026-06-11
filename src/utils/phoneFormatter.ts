export function formatPhoneNumber(phone: string, defaultCountryCode: string = '57'): string {
  if (!phone) return '';
  
  // 1. Quitar cualquier carácter que no sea número o el signo más
  let cleaned = phone.replace(/[^\d+]/g, '');

  // 2. Si empieza por +, asumir que ya tiene código de país, solo quitar el +
  if (cleaned.startsWith('+')) {
    return cleaned.substring(1);
  }

  // 3. Si el número tiene 10 dígitos (típico celular en Colombia/Latam) y no tiene el código de país, agregarlo
  if (cleaned.length === 10) {
    return `${defaultCountryCode}${cleaned}`;
  }

  // 4. Si el número ya parece tener el código de país (ej. 57318... tiene 12 dígitos)
  if (cleaned.length > 10 && cleaned.startsWith(defaultCountryCode)) {
    return cleaned;
  }

  // En caso de duda, devolver el número limpio pero asumiendo que el usuario sabe lo que hace
  return cleaned;
}
