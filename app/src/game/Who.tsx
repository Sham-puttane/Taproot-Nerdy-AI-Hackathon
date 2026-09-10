/**
 * "Whose grove is this?"
 *
 * Shown once, before anything else, when a device has more than one learner
 * on it -- or none yet. A tutor moving between students taps a face; a family
 * sharing a tablet does the same.
 *
 * Deliberately readable by a five-year-old who cannot yet read: each learner
 * gets a colour and the first letter of their name at a size you can hit with
 * a thumb. The name is there for the grown-up.
 *
 * Nothing here leaves the device. A first name on a shared tablet is a name a
 * stranger can read, so it is stored locally, never sent, and asked for only
 * because a child needs to recognise her own tree.
 */
import { useState } from 'react'
import type { Learner } from './learners'

export function Who({
  learners,
  onPick,
  onAdd,
  onRemove,
  onClose,
}: {
  learners: Learner[]
  onPick: (id: string) => void
  onAdd: (name: string) => void
  onRemove: (id: string) => void
  onClose?: () => void
}) {
  const [adding, setAdding] = useState(learners.length === 0)
  const [name, setName] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    onAdd(n)
    setName('')
    setAdding(false)
  }

  return (
    <div className="who">
      <div className="who-card">
        <div className="kicker">
          {learners.length ? 'whose grove is this?' : 'before we plant anything'}
        </div>
        <h1 className="who-title">
          {learners.length ? 'Who is digging today?' : 'What should we call you?'}
        </h1>
        {learners.length > 0 && (
          <p className="who-sub">
            Everyone gets their own trees. Nothing you do here shows up in
            anyone else&rsquo;s grove.
          </p>
        )}

        {learners.length > 0 && (
          <div className="who-grid">
            {learners.map((l) => (
              <div key={l.id} className="who-slot">
                <button
                  className="who-pick"
                  style={{ background: l.colour }}
                  onClick={() => onPick(l.id)}
                >
                  <span className="who-initial">
                    {l.name.slice(0, 1).toUpperCase()}
                  </span>
                </button>
                <span className="who-name">{l.name}</span>
                <button
                  className="who-remove"
                  aria-label={`Take ${l.name} off this device`}
                  onClick={() => onRemove(l.id)}
                >
                  remove
                </button>
              </div>
            ))}

            {!adding && (
              <div className="who-slot">
                <button className="who-pick who-new"
                        onClick={() => setAdding(true)}>
                  <span className="who-initial">+</span>
                </button>
                <span className="who-name">Someone else</span>
              </div>
            )}
          </div>
        )}

        {adding && (
          <form className="who-form" onSubmit={submit}>
            <input
              className="who-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              maxLength={24}
              autoFocus
              aria-label="First name"
            />
            <button className="go" type="submit" disabled={!name.trim()}>
              Start a grove
            </button>
            {learners.length > 0 && (
              <button type="button" className="go quiet"
                      onClick={() => { setAdding(false); setName('') }}>
                Never mind
              </button>
            )}
          </form>
        )}

        {onClose && learners.length > 0 && !adding && (
          <button className="go quiet who-back" onClick={onClose}>
            Back
          </button>
        )}

        <p className="who-note">
          Names stay on this device. Nothing is sent anywhere.
        </p>
      </div>
    </div>
  )
}
