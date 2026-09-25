// Masks contact details in public API responses so scrapers hitting the public
// list/search/detail endpoints can't harvest raw phone numbers/emails in bulk. The real
// values are only ever served one at a time via the separate contact-reveal endpoint.

export function maskPhone(phone: string): string {
  const digitPositions: number[] = [];
  for (let i = 0; i < phone.length; i++) {
    if (/\d/.test(phone[i])) digitPositions.push(i);
  }

  const totalDigits = digitPositions.length;
  if (totalDigits === 0) return phone;
  if (totalDigits <= 4) return phone.replace(/\d/g, '*');

  const keepStart = 3;
  const keepEnd = 2;
  const chars = phone.split('');
  digitPositions.forEach((pos, idx) => {
    const isKeptStart = idx < keepStart;
    const isKeptEnd = idx >= totalDigits - keepEnd;
    if (!isKeptStart && !isKeptEnd) {
      chars[pos] = '*';
    }
  });
  return chars.join('');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '*'.repeat(email.length);

  const visible = local.slice(0, 1) || '*';
  const maskedLocal = `${visible}${'*'.repeat(Math.max(local.length - 1, 3))}`;
  return `${maskedLocal}@${domain}`;
}

export function maskContactInfo<T extends { phone?: string; email?: string }>(contactInfo: T): T {
  return {
    ...contactInfo,
    ...(contactInfo.phone ? { phone: maskPhone(contactInfo.phone) } : {}),
    ...(contactInfo.email ? { email: maskEmail(contactInfo.email) } : {}),
  };
}
