/**
 * Answer by speaking.
 *
 * Only ever an addition: the options are still there, still tappable, and the
 * microphone hides itself entirely when the browser cannot do this or there is
 * no network. A feature that quietly removes a way to answer would be worse
 * than not having it.
 */
import { useVoice } from './useVoice'

export function VoiceAnswer({
  options,
  onPick,
  disabled,
}: {
  options: string[]
  onPick: (index: number) => void
  disabled?: boolean
}) {
  const { listening, heard, listen, stop, supported } = useVoice((candidates) => {
    // Match what she said against the options on screen. Comparing against the
    // visible options rather than trying to parse free speech keeps this
    // robust: the recogniser only has to get close.
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')
    const idx = options.findIndex((o) =>
      candidates.some((c) => norm(c) === norm(o)),
    )
    if (idx >= 0) onPick(idx)
  })

  if (!supported) return null

  return (
    <>
      <button
        className={`mic${listening ? ' on' : ''}`}
        onClick={listening ? stop : listen}
        disabled={disabled}
        aria-label={listening ? 'Stop listening' : 'Answer out loud'}
      >
        {listening ? '● Listening…' : '🎤 Say it instead'}
      </button>
      {heard && !listening && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--ink-faint)',
            margin: '6px 0 0',
            textAlign: 'center',
          }}
        >
          heard &ldquo;{heard}&rdquo;
        </p>
      )}
    </>
  )
}
