export function formatCurrency(amount: number, currency: string = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// docs/Pricing-Strategy-Plan.md — a listing's plan-determined visibility window has run out.
// `expiresAt` of null/undefined means the plan never expires listings (e.g. Business tier).
export function isPropertyExpired(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() <= Date.now();
}

// docs/Pricing-Strategy-Plan.md — lets owners see when a listing's visibility window
// ends without having to wait for the Renew button to appear.
export function formatExpiryDate(expiresAt: string | null | undefined): string {
  if (!expiresAt) return 'Never expires';

  const formatted = new Date(expiresAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return isPropertyExpired(expiresAt) ? `Expired ${formatted}` : `Expires ${formatted}`;
}

export function formatFloor(floor: number): string {
  if (floor === 0) return 'Ground';

  const remainder100 = Math.abs(floor) % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${floor}th`;

  switch (Math.abs(floor) % 10) {
    case 1: return `${floor}st`;
    case 2: return `${floor}nd`;
    case 3: return `${floor}rd`;
    default: return `${floor}th`;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Please upload images smaller than 10MB.',
    };
  }

  return { isValid: true };
}

export function validateDocumentFile(file: File): { isValid: boolean; error?: string } {
  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const maxSize = 15 * 1024 * 1024; // 15MB

  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload a PDF, JPEG, PNG, or Word document.',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Please upload a file smaller than 15MB.',
    };
  }

  return { isValid: true };
}
