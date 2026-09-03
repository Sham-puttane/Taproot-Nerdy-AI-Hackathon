/**
 * The moment one repair wakes everything standing on it.
 *
 * This is the product's entire argument, and until now it happened in
 * silence: she fixed a kindergarten idea, the engine updated six beliefs, and
 * the screen said "climbing back". The single most motivating fact available
 * -- that the thing she just fixed was holding up her homework five grades
 * above -- was never shown to her.
 *
 * Why this and not points: the research on gamified maths is unkind to
 * extrinsic rewards, which shift the locus of causality outward and can
 * undermine the motivation they are meant to create. What they consistently
 * fail to deliver is COMPETENCE -- the feeling of mastery -- which is the one
 * need a diagnostic engine is actually built to satisfy. So the reward here is
 * evidence: a list of real skills, from the real prerequisite graph, that
 * were resting on the thing she just repaired. Nothing is invented for effect.
 *
 * It lights one rung at a time from the bottom, because the cascade IS the
 * claim: it travels upward, and she should watch it travel.
 */
import { useEffect, useRef, useState } from 'react'
import type { Pack } from './pack'
import { kidName } from './pack'

const HUE: Record<number, string> = {
  5: '#f8836b', 4: '#ffc94a', 3: '#4fb083',
  2: '#3fbfa0', 1: '#5bb8e8', 0: '#a97ff0',
}
const gnum = (g: string) => (g === 'K' ? 0 : Number(g) || 0)

const STEP = 340   // ms between rungs -- slow enough to read a name

export function Cascade({
  pack,
  fixed,
  woke,
  wokeTotal,
  onLight,
  onDone,
}: {
  pack: Pack
  /** the skill she just repaired */
  fixed: string
  /** what rests on it ON HER PATH -- the rungs she was actually blocked on */
  woke: string[]
  /** how many skills in the whole K-5 map rest on it */
  wokeTotal: number
  /** called as each rung lights, so the trail can follow along */
  onLight: (nodeId: string) => void
  onDone: () => void
}) {
  const [at, setAt] = useState(0)
  const listRef = useRef<HTMLOListElement>(null)
  const node = (id: string) => pack.nodes.find((n) => n.id === id)
  const fixedNode = node(fixed)

  // Only ever climbs. Kept in a ref so a re-render cannot restart the run.
  const lightRef = useRef(onLight)
  lightRef.current = onLight
  useEffect(() => {
    if (at >= woke.length) return
    const t = window.setTimeout(() => {
      lightRef.current(woke[at])
      setAt((n) => n + 1)
    }, at === 0 ? 620 : STEP)
    return () => window.clearTimeout(t)
  }, [at, woke])

  // A deep gap can wake a dozen rungs, which is more than fits on a screen.
  // The list scrolls rather than truncating -- the COUNT is the evidence, and
  // trimming it to fit would quietly weaken the claim -- so the newest rung is
  // kept in view as the cascade climbs.
  useEffect(() => {
    const el = listRef.current?.querySelector('.cx-rung.on')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [at])

  const finished = at >= woke.length
  const top = woke.length ? node(woke[woke.length - 1]) : undefined

  return (
    <div className="cx">
      <div className="kicker">it was never one skill</div>
      <h1 className="cx-title">
        {woke.length === 0
          ? 'Fixed.'
          : `${at} of ${woke.length} just woke up.`}
      </h1>
      <p className="cx-sub">
        {fixedNode && (
          <>
            Everything here was resting on <b>{kidName(fixedNode)}</b>
            {top && gnum(top.grade) > gnum(fixedNode.grade) && (
              <>
                {' '}&mdash; all the way up to grade {top.grade}
              </>
            )}
            .
          </>
        )}
      </p>
      {wokeTotal > woke.length && (
        <p className="cx-wider">
          Across the whole K&ndash;5 map, <b>{wokeTotal} skills</b> rest on
          it. These {woke.length} are the ones between it and your homework.
        </p>
      )}

      <ol className="cx-list" ref={listRef}>
        {fixedNode && (
          <li className="cx-rung cx-fixed on" style={{
            ['--gc' as string]: HUE[gnum(fixedNode.grade)],
          }}>
            <span className="cx-dot">
              {fixedNode.grade === 'K' ? 'K' : fixedNode.grade}
            </span>
            <span className="cx-name">
              {kidName(fixedNode)}
              <em>you fixed this</em>
            </span>
          </li>
        )}
        {woke.map((id, i) => {
          const n = node(id)
          if (!n) return null
          const on = i < at
          return (
            <li
              key={id}
              className={`cx-rung${on ? ' on' : ''}`}
              style={{ ['--gc' as string]: HUE[gnum(n.grade)] }}
            >
              <span className="cx-dot">{n.grade === 'K' ? 'K' : n.grade}</span>
              <span className="cx-name">{kidName(n)}</span>
              <span className="cx-tick" aria-hidden="true">
                {on ? '✦' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <button
        className="go cx-go"
        onClick={finished ? onDone : () => setAt(woke.length)}
      >
        {finished ? 'Climb back up' : 'Show me all of it'}
      </button>
    </div>
  )
}
