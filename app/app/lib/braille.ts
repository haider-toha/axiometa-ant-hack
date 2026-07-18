// Grade-1 (uncontracted) braille A–Z, mirroring the firmware bit layout.
// Each cell is a 6-bit mask where bit0=dot1, bit1=dot2, … bit5=dot6.
// Physical cell (dots are numbered down-then-across):
//
//     dot1 (0x01)   dot4 (0x08)
//     dot2 (0x02)   dot5 (0x10)
//     dot3 (0x04)   dot6 (0x20)
//
// Index 0 = 'a' … index 25 = 'z'. These masks are identical to the firmware's
// table so the wearable and the web app agree bit-for-bit.
export const BRAILLE: readonly number[] = [
  0x01, 0x03, 0x09, 0x19, 0x11, 0x0b, 0x1b, 0x13, 0x0a, 0x1a, // a b c d e f g h i j
  0x05, 0x07, 0x0d, 0x1d, 0x15, 0x0f, 0x1f, 0x17, 0x0e, 0x1e, // k l m n o p q r s t
  0x25, 0x27, 0x3a, 0x2d, 0x3d, 0x35,                          // u v w x y z
];

/**
 * The 6-bit dot mask for a single letter. Non a–z characters (e.g. the spaces
 * in a multi-word keyword) map to 0 — a blank cell — which is the correct
 * tactile behaviour, not a stub.
 */
export function maskFor(letter: string): number {
  const code = letter.toLowerCase().charCodeAt(0) - 97; // 'a' → 0
  if (code < 0 || code > 25) return 0; // non-letter → blank cell
  return BRAILLE[code];
}

/**
 * The dot numbers (1–6) raised for a letter, in ascending order.
 * e.g. dotsFor("c") → [1, 4].
 */
export function dotsFor(letter: string): number[] {
  const mask = maskFor(letter);
  const dots: number[] = [];
  for (let bit = 0; bit < 6; bit++) {
    if (mask & (1 << bit)) dots.push(bit + 1);
  }
  return dots;
}
