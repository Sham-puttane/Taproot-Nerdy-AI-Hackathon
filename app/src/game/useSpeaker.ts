/**
 * The app reading itself aloud.
 *
 * The pieces were all here -- speech synthesis works, the 🔊 button works --
 * but nothing ever spoke unless a child tapped it, so there was no voice in
 * the product at all. A read-aloud button you have to press for every single
 * question is a feature a struggling reader will use twice and then stop.
 *
 * That matters more here than it looks. The children furthest behind in maths
 * are very often behind in reading too, so an unread word problem measures
 * decoding rather than numeracy -- and we have just replaced 624 bare sums
 * with word problems, which makes the reading load HIGHER than it was. Voice
 * is what keeps that from being a step backwards for exactly the child this
 * is built for.
 *
 * On by default, with a visible switch. Muting is remembered, because a child
 * in a classroom mutes once and should not have to do it again every session.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { speak } from './tts'

const KEY = 'taproot:voice'

function initial(): boolean {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === null ? true : saved === 'on'
  } catch {
    return true       // private window, blocked storage: still speak
  }
}

export function useSpeaker() {
  const [on, setOn] = useState(initial)
  // What was last said, so a re-render cannot make the app repeat itself
  // mid-sentence -- which sounds broken rather than helpful.
  const last = useRef<string>('')

  useEffect(() => {
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off')
    } catch { /* not worth failing over */ }
    if (!on && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }, [on])

  /** Say something, unless it is the very thing we just said. */
  const say = useCallback((text: string | null | undefined, rate?: number) => {
    if (!on || !text) return
    const t = text.trim()
    if (!t || t === last.current) return
    last.current = t
    speak(t, rate ? { rate } : {})
  }, [on])

  /** Let the next call repeat a line -- used when a phase restarts. */
  const reset = useCallback(() => { last.current = '' }, [])

  const toggle = useCallback(() => {
    setOn((v) => {
      if (v && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
      return !v
    })
  }, [])

  return { on, toggle, say, reset }
}
