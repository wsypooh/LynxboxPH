// Real-world CSV exports — especially Excel's plain "CSV (Comma delimited)" save option on
// Windows, as opposed to "CSV UTF-8 (Comma delimited)" — are very often Windows-1252/ANSI,
// not UTF-8, with no way for the file itself to declare that. Reading such a file as UTF-8
// (e.g. FileReader.readAsText(file)'s default) doesn't error — accented characters like "ñ"
// (single byte 0xF1 in Windows-1252) just decode as the U+FFFD replacement character "�",
// silently corrupting names on import. Try strict UTF-8 first (the common, correct case) and
// only fall back to Windows-1252 if that actually fails to decode.
function decodeCsvBuffer(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

export function readCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(decodeCsvBuffer(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// The mirror-image problem: Excel doesn't assume a downloaded .csv is UTF-8 unless the file
// itself says so via a BOM — without one, opening an otherwise-correct UTF-8 file straight
// from the browser's Downloads often shows the same "ñ" → mojibake symptom, just triggered by
// Excel misreading a file this app wrote correctly, rather than this app misreading Excel's.
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
