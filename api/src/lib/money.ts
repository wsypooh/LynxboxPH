// Rounds to 2 decimal places (peso/centavo). Money values derived by multiplication
// (rate × rent, meter reading × rate, etc.) routinely land on 3+ decimal places — if that
// raw value is stored and only rounded at final display time, a line item's displayed
// figure and the total's displayed figure are rounded independently, and can be off by a
// centavo from each other even though the underlying math is technically consistent. Every
// derived monetary value should be rounded here at the point it's computed, not at display
// time, so what's shown always adds up exactly the way it looks like it should.
export function round2(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
