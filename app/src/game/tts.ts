/**
 * Read-aloud, via the browser's own speech synthesis.
 *
 * Free, offline once voices are installed, and it matters more than it looks:
 * the children furthest behind in maths are very often behind in reading too,
 * so an unread word problem measures decoding rather than numeracy. This
 * decouples the two.
 */

/** "3/4 + 1/6" is read as "three slash four plus one slash six" otherwise. */
export function speakable(text: string): string {
  return text
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_m, a, b) => fractionWords(+a, +b))
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/\+/g, ' plus ')
    .replace(/(?<=\d)\s*-\s*(?=\d)/g, ' minus ')
    .replace(/=/g, ' equals ')
    .replace(/\?/g, '?')
    .replace(/\s+/g, ' ')
    .trim()
}

const ORDINAL: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['quarter', 'quarters'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  8: ['eighth', 'eighths'],
  10: ['tenth', 'tenths'],
  12: ['twelfth', 'twelfths'],
  100: ['hundredth', 'hundredths'],
}

function fractionWords(num: number, den: number): string {
  const names = ORDINAL[den]
  if (!names) return `${num} over ${den}`
  return `${num} ${num === 1 ? names[0] : names[1]}`
}

export function speak(text: string): void {
  try {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(speakable(text))
    u.rate = 0.92 // a little slower than default; these are 8-year-olds
    u.pitch = 1.05
    speechSynthesis.speak(u)
  } catch {
    /* no voices installed, or blocked -- the text is on screen regardless */
  }
}
