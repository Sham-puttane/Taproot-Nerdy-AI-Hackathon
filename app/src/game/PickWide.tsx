/**
 * "Where are you, and what beat you?" — at full width, in the Grove's language.
 *
 * The old version was a 460px cream column with five numbered squares. It
 * asked the right two questions and taught nothing, and it threw away the one
 * idea the child needs to hold before she plays: that her grade is a LAYER OF
 * GROUND and a topic is a TREE growing out of it.
 *
 * So the grade picker IS the strata she saw on the home screen, and the topic
 * picker IS the row of trees. By the time the first question appears she has
 * already been told, without a sentence of instruction, what the descent is
 * going to do: go down through those bands, under that tree.
 *
 * Deliberately still two taps. This is not a placement quiz -- a placement
 * quiz is the exact thing this product exists to replace.
 */
import { useState } from 'react'
import type { Pack } from './pack'
import { GRADES, topicsFor, wallFor, type Topic } from './walls'

/**
 * Same fills as the Grove's ground, so this reads as the same cross-section.
 * Filtered through GRADES so the picker can never offer a layer the rest of
 * the app does not serve -- a band that led nowhere would be worse than a
 * missing one, because it looks tappable.
 */
const BANDS = ([
  { grade: '5', fill: '#ffe0a0', ink: '#7a6330' },
  { grade: '4', fill: '#f0c477', ink: '#6b5628' },
  { grade: '3', fill: '#d9a758', ink: '#4a3512' },
  { grade: '2', fill: '#b8863c', ink: '#f7ecd8' },
  { grade: '1', fill: '#8a5a28', ink: '#f0e2c8' },
] as const).filter((b) => (GRADES as readonly string[]).includes(b.grade))

const TREE_HUE: Record<string, string> = {
  fractions: '#f8836b',
  times: '#ffc94a',
  bignumbers: '#5bb8e8',
  measuring: '#4fb083',
  shapes: '#a97ff0',
}

export function PickWide({
  pack,
  onPick,
  onBack,
}: {
  pack: Pack
  onPick: (wallCode: string) => void
  onBack: () => void
}) {
  const [grade, setGrade] = useState<string | null>(null)
  const topics = grade ? topicsFor(pack, grade) : []

  return (
    <div className="pw">
      <div className="pw-sky">
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none"
             className="pw-sky-art" aria-hidden="true">
          <circle cx="1300" cy="52" r="30" fill="#ffc94a" />
          <g fill="#ffffff" opacity=".8">
            <ellipse cx="230" cy="60" rx="50" ry="21" />
            <ellipse cx="272" cy="51" rx="32" ry="18" />
            <ellipse cx="920" cy="46" rx="42" ry="18" />
          </g>
        </svg>

        <button className="pw-back" onClick={onBack}>
          ← back to my grove
        </button>

        <header className="pw-head">
          <div className="kicker" style={{ color: '#1d3a52', opacity: 0.72 }}>
            before we dig
          </div>
          <h1 className="pw-title">
            {grade ? 'What beat you?' : 'How deep are we starting?'}
          </h1>
          <p className="pw-sub">
            {grade
              ? 'Pick the tree your homework came from. We start at the top of it and dig down.'
              : 'Tap the layer you are standing on. Everything underneath it is fair game.'}
          </p>
        </header>

        {grade && (
          <div className="pw-standing">
            you are on <b>grade {grade}</b>
            <button className="pw-change" onClick={() => setGrade(null)}>
              change
            </button>
          </div>
        )}
      </div>

      {!grade ? (
        /* Step 1 — the ground, cut open. Each band is the button. */
        <div className="pw-ground">
          {BANDS.map((b, i) => (
            <button
              key={b.grade}
              className="pw-band"
              style={{ background: b.fill, color: b.ink, zIndex: 10 - i }}
              onClick={() => setGrade(b.grade)}
            >
              <span className="pw-band-name">GRADE {b.grade}</span>
              <span className="pw-band-hint">
                {b.grade === '5'
                  ? 'top layer — newest work'
                  : b.grade === '1'
                    ? 'bedrock — where counting lives'
                    : `${5 - Number(b.grade)} layer${
                        5 - Number(b.grade) === 1 ? '' : 's'
                      } of ground below`}
              </span>
              <span className="pw-band-go" aria-hidden="true">
                start here ↓
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* Step 2 — the trees, standing on that layer. */
        <div className="pw-orchard">
          <div className="pw-trees">
            {topics.map((t: Topic, i) => {
              const hue = TREE_HUE[t.id] ?? '#46c9a4'
              return (
                <button
                  key={t.id}
                  className="pw-tree"
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => {
                    const code = wallFor(pack, t, grade)
                    if (code) onPick(code)
                  }}
                >
                  <svg viewBox="0 0 160 160" className="pw-tree-art"
                       aria-hidden="true">
                    <rect x="73" y="104" width="14" height="34" rx="5"
                          fill="#8a5a28" />
                    <circle cx="80" cy="76" r="34"
                            fill={`color-mix(in srgb, ${hue} 26%, #46c9a4)`} />
                    <circle cx="52" cy="94" r="22" fill="#3bb694" />
                    <circle cx="108" cy="94" r="22" fill="#57d3ae" />
                    <circle cx="66" cy="66" r="7" fill={hue} />
                    <circle cx="96" cy="82" r="6" fill={hue} opacity=".85" />
                  </svg>
                  <span className="pw-tree-icon" aria-hidden="true">
                    {t.icon}
                  </span>
                  <span className="pw-tree-name">{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* the strata continue beneath the trees, so the promise is visible:
              this is what we are about to dig through */}
          <div className="pw-under">
            {BANDS.filter((b) => b.grade <= grade).map((b) => (
              <div key={b.grade} className="pw-under-band"
                   style={{ background: b.fill, color: b.ink }}>
                GRADE {b.grade}
              </div>
            ))}
            <div className="pw-under-band" style={{ background: '#6b4520', color: '#d9bd93' }}>
              KINDER
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
