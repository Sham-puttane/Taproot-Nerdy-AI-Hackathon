/**
 * The roots: the prerequisite path, drawn downward.
 *
 * Only the corridor the child has actually walked is shown, not all 52 nodes.
 * The full cone is unreadable on a phone in portrait -- grade 4 alone has 17
 * skills in one band -- and the descent never needs the whole graph, only the
 * path beneath her feet.
 *
 * Deepest sits at the bottom, so "going down" on screen is going down in the
 * curriculum. Lit means repaired, and the cascade running upward is the whole
 * thesis in one animation: fix the root, everything above it lights.
 */
import type { Pack } from './game/pack'
import { kidName } from './game/pack'
import { gradeVar } from './game/grade'

export function Roots({
  pack,
  path,
  lit,
  here,
  masteryOf,
}: {
  pack: Pack
  path: string[]
  lit: Set<string>
  here?: string
  masteryOf: (id: string) => number
}) {
  const byId = new Map(pack.nodes.map((n) => [n.id, n]))
  // deepest (most foundational) last, so the eye travels down as she descends
  const rows = [...new Set(path)]
    .map((id) => byId.get(id))
    .filter((n): n is NonNullable<typeof n> => !!n)
    .sort((a, b) => b.depth - a.depth)

  if (!rows.length) return null

  return (
    <div style={{ marginTop: 18 }} aria-hidden="true">
      {rows.map((n, i) => {
        const isLit = lit.has(n.id)
        const isHere = n.id === here
        const solid = masteryOf(n.id) >= 0.6
        // Lit and current states override, but an untouched node still shows
        // its grade colour so the corridor reads as a depth gradient.
        const colour = isLit
          ? gradeVar(n.grade)
          : isHere
            ? 'var(--wrong)'
            : solid
              ? gradeVar(n.grade)
              : 'var(--root-dead)'
        return (
          <div key={n.id}>
            {i > 0 && (
              <div
                style={{
                  width: 2,
                  height: 12,
                  marginLeft: 5,
                  background: isLit ? 'var(--glow)' : 'var(--root-line)',
                  transition: 'background .5s ease',
                }}
              />
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: isHere || isLit ? 1 : 0.62,
                transition: 'opacity .4s ease',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: colour,
                  flex: 'none',
                  boxShadow: isLit
                    ? '0 0 12px 2px color-mix(in srgb, var(--glow) 55%, transparent)'
                    : 'none',
                  transition: 'background .45s ease, box-shadow .45s ease',
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: isLit
                    ? 'var(--glow-soft)'
                    : isHere
                      ? 'var(--ink)'
                      : 'var(--ink-faint)',
                }}
              >
                {kidName(n)}
                <span
                  style={{
                    fontSize: 11,
                    marginLeft: 6,
                    color: 'var(--ink-faint)',
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  }}
                >
                  gr {n.grade}
                </span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
