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

/**
 * The default voice on most machines is the flattest one installed, which
 * sounds like a parking meter. Prefer a natural/neural voice if the platform
 * has one -- it is the difference between a computer reading at a child and
 * somebody talking to her.
 */
let chosen: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  if (chosen !== undefined) return chosen
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null // not loaded yet; try again next call
  const en = voices.filter((v) => v.lang.startsWith('en'))
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase()
    let s = 0
    if (/natural|neural|premium|enhanced/.test(n)) s += 6
    if (/google|aria|jenny|libby|sonia|ava|samantha/.test(n)) s += 4
    if (v.lang === 'en-GB' || v.lang === 'en-US') s += 1
    if (/david|zira|microsoft (mark|david)/.test(n)) s -= 3 // the flat ones
    return s
  }
  chosen = en.sort((a, b) => score(b) - score(a))[0] ?? null
  return chosen
}

if (typeof speechSynthesis !== 'undefined') {
  // Chrome populates voices asynchronously; re-pick once they arrive.
  speechSynthesis.onvoiceschanged = () => {
    chosen = undefined
    pickVoice()
  }
}

export function speak(text: string, opts: { rate?: number } = {}): void {
  try {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(speakable(text))
    const v = pickVoice()
    if (v) u.voice = v
    u.rate = opts.rate ?? 0.95 // a touch slower; these are 8-year-olds
    u.pitch = 1.05
    speechSynthesis.speak(u)
  } catch {
    /* no voices installed, or blocked -- the text is on screen regardless */
  }
}

/** Speak a line of coaching, slightly slower than a question. */
export function coach(text: string): void {
  speak(text, { rate: 0.9 })
}
