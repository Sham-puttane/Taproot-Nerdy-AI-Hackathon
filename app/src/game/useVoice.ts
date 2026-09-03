/**
 * Answering out loud.
 *
 * Typing and tapping are not the only barriers for an eight-year-old. Saying
 * "two thirds" is how she would answer a teacher, and it is markedly easier
 * than finding the right box on a shared tablet in a moving car.
 *
 * Uses the browser's own recogniser -- free, no key, no account. One honest
 * caveat: Chrome's implementation sends audio to a Google server, so unlike
 * the rest of the game this part needs a network. It therefore only ever
 * ADDS a way to answer; every question stays fully answerable by tapping, and
 * the microphone simply does not appear when it cannot work.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

// The API is still prefixed in most browsers and is not in the DOM lib.
type Recognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: unknown) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => Recognition)
    | null
}

export function voiceSupported(): boolean {
  return getRecognitionCtor() !== null && navigator.onLine
}

const WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12',
}
const DENOM: Record<string, string> = {
  half: '2', halves: '2', third: '3', thirds: '3',
  quarter: '4', quarters: '4', fourth: '4', fourths: '4',
  fifth: '5', fifths: '5', sixth: '6', sixths: '6',
  eighth: '8', eighths: '8', tenth: '10', tenths: '10',
  twelfth: '12', twelfths: '12',
}

/**
 * "two thirds" -> "2/3". Children say fractions in words, and a recogniser
 * hands back words, so the mapping has to happen somewhere.
 */
export function interpret(said: string): string[] {
  const t = said.toLowerCase().replace(/[.,!?]/g, ' ').trim()
  const out = new Set<string>([t])

  // "three quarters", "one half", "two thirds"
  const m = t.match(
    /\b(\w+)\s+(halves?|thirds?|quarters?|fourths?|fifths?|sixths?|eighths?|tenths?|twelfths?)\b/,
  )
  if (m) {
    const n = WORDS[m[1]] ?? (/^\d+$/.test(m[1]) ? m[1] : null)
    const d = DENOM[m[2]]
    if (n && d) out.add(`${n}/${d}`)
  }
  // "three over four", "three out of four"
  const over = t.match(/\b(\w+)\s+(?:over|out of)\s+(\w+)\b/)
  if (over) {
    const n = WORDS[over[1]] ?? over[1]
    const d = WORDS[over[2]] ?? over[2]
    if (/^\d+$/.test(n) && /^\d+$/.test(d)) out.add(`${n}/${d}`)
  }
  // bare number words
  if (WORDS[t]) out.add(WORDS[t])
  // digits anywhere, e.g. "it's 3 4" from a mis-heard fraction
  const digits = t.match(/\d+/g)
  if (digits?.length === 1) out.add(digits[0])
  if (digits?.length === 2) out.add(`${digits[0]}/${digits[1]}`)
  // yes / no
  if (/^(yes|yeah|yep)\b/.test(t)) out.add('Yes')
  if (/^(no|nope|nah)\b/.test(t)) out.add('No')

  return [...out]
}

export function useVoice(onHeard: (candidates: string[]) => void) {
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  const cb = useRef(onHeard)
  cb.current = onHeard

  useEffect(() => () => rec.current?.abort(), [])

  const listen = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    try {
      rec.current?.abort()
      const r = new Ctor()
      r.lang = 'en-US'
      r.interimResults = false
      r.maxAlternatives = 3
      r.continuous = false
      r.onresult = (e: unknown) => {
        const ev = e as { results: { [k: number]: { [k: number]: { transcript: string } }, length: number } }
        const alts: string[] = []
        const first = ev.results[0] as unknown as { length: number } & Record<number, { transcript: string }>
        for (let i = 0; i < (first?.length ?? 0); i++) {
          const t = first[i]?.transcript
          if (t) alts.push(t)
        }
        setHeard(alts[0] ?? null)
        cb.current(alts.flatMap(interpret))
      }
      r.onerror = () => setListening(false)
      r.onend = () => setListening(false)
      rec.current = r
      setHeard(null)
      setListening(true)
      r.start()
    } catch {
      setListening(false)
    }
  }, [])

  const stop = useCallback(() => {
    rec.current?.stop()
    setListening(false)
  }, [])

  return { listening, heard, listen, stop, supported: voiceSupported() }
}
