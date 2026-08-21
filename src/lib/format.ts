/**
 * PKR currency formatter — uses Pakistani lakh/crore notation.
 * formatPKR(4200)     → "₨ 4,200"
 * formatPKR(450000)   → "₨ 4,50,000"
 * formatPKR(12000000) → "₨ 1.2 کروڑ" (short form)
 */
export function formatPKR(amount: number, short = false): string {
  if (isNaN(amount)) return "₨ --";

  if (short) {
    if (amount >= 10_000_000) return `₨ ${(amount / 10_000_000).toFixed(1)} کروڑ`;
    if (amount >= 100_000) return `₨ ${(amount / 100_000).toFixed(1)} لاکھ`;
    if (amount >= 1_000) return `₨ ${(amount / 1_000).toFixed(0)}K`;
  }

  // Pakistani number system grouping: last 3 then groups of 2
  const str = Math.floor(amount).toString();
  if (str.length <= 3) return `₨ ${str}`;

  const last3 = str.slice(-3);
  const remaining = str.slice(0, -3);
  const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `₨ ${grouped},${last3}`;
}

/**
 * Phone number formatter for Pakistani numbers.
 * formatPhone("03001234567") → "+92 300 1234567"
 * formatPhone("+923001234567") → "+92 300 1234567"
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Strip leading 0 or 92
  const local = digits.startsWith("92")
    ? digits.slice(2)
    : digits.startsWith("0")
    ? digits.slice(1)
    : digits;
  if (local.length === 10) {
    return `+92 ${local.slice(0, 3)} ${local.slice(3)}`;
  }
  return phone; // Return as-is if format unknown
}

/**
 * Validates Pakistani CNIC format: XXXXX-XXXXXXX-X
 */
export function validateCNIC(value: string): boolean {
  return /^\d{5}-\d{7}-\d{1}$/.test(value.trim());
}

/**
 * Validates Pakistani mobile number.
 * Accepts: 03XXXXXXXXX or +923XXXXXXXXX
 */
export function validatePKPhone(value: string): boolean {
  return /^(\+92|0)3[0-9]{9}$/.test(value.trim().replace(/\s/g, ""));
}

/**
 * Formats a number for display with compact notation.
 * formatCompact(50000) → "50k"
 * formatCompact(1200000) → "1.2M"
 */
export function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
  return String(num);
}
