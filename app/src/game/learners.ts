/**
 * Who is playing.
 *
 * One device, several children. That is not a corner case for this product --
 * it is Nerdy's actual business. A tutor sits down with four students in an
 * afternoon, and a family shares one tablet between siblings. Until now every
 * one of them wrote into the same progress record, so a younger sibling's
 * kindergarten session quietly counted toward an older one's grove, and the
 * one thing the home screen promises -- "this is YOUR tree" -- was a lie the
 * second person to touch the device.
 *
 * Progress is therefore keyed per learner. The keys are local ids, never
 * anything identifying: a name typed on a shared tablet is a name a stranger
 * can read, so it stays on the device, is never sent anywhere, and the app
 * asks for a first name only because a child needs to recognise her own tree.
 */
import { get as dbGet, put as dbPut } from './db'
import { EMPTY, type Progress } from './progress'

const STORE = 'progress'
const ROSTER = 'roster'
/** Where progress lived before there was more than one learner. */
const LEGACY = 'progress'

export interface Learner {
  id: string
  name: string
  /** Chosen once so a child can find herself by colour, not by reading. */
  colour: string
  createdAt: number
  lastPlayed: number
}

/** Deliberately the grade colours, so the roster belongs to the same world. */
export const COLOURS = [
  '#f8836b', '#ffc94a', '#4fb083', '#3fbfa0', '#5bb8e8', '#a97ff0',
]

interface Roster {
  learners: Learner[]
  activeId: string | null
}

const EMPTY_ROSTER: Roster = { learners: [], activeId: null }

function newId(): string {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export async function loadRoster(): Promise<Roster> {
  const saved = await dbGet<Roster>(STORE, ROSTER)
  return { ...EMPTY_ROSTER, ...(saved ?? {}) }
}

async function saveRoster(r: Roster): Promise<boolean> {
  return dbPut(STORE, ROSTER, r)
}

export async function addLearner(name: string): Promise<Learner> {
  const r = await loadRoster()
  const learner: Learner = {
    id: newId(),
    name: name.trim().slice(0, 24) || 'Me',
    colour: COLOURS[r.learners.length % COLOURS.length],
    createdAt: Date.now(),
    lastPlayed: Date.now(),
  }
  r.learners = [...r.learners, learner]
  r.activeId = learner.id

  // The first learner on a device that already has progress inherits it,
  // rather than being handed an empty grove while their real one sits
  // unreachable under the old key. Anyone after that starts fresh.
  if (r.learners.length === 1) {
    const legacy = await dbGet<Progress>(STORE, LEGACY)
    if (legacy && Object.keys(legacy.mastery ?? {}).length) {
      await dbPut(STORE, keyFor(learner.id), legacy)
    }
  }
  await saveRoster(r)
  return learner
}

export async function removeLearner(id: string): Promise<void> {
  const r = await loadRoster()
  r.learners = r.learners.filter((l) => l.id !== id)
  if (r.activeId === id) r.activeId = r.learners[0]?.id ?? null
  await saveRoster(r)
  // The grove itself is left on disk. Deleting a child's whole history
  // because someone tapped the wrong X is not a thing to do quietly, and the
  // record is small.
}

export async function setActive(id: string): Promise<void> {
  const r = await loadRoster()
  if (!r.learners.some((l) => l.id === id)) return
  r.activeId = id
  r.learners = r.learners.map((l) =>
    l.id === id ? { ...l, lastPlayed: Date.now() } : l)
  await saveRoster(r)
}

export const keyFor = (id: string) => `progress:${id}`

export async function loadFor(id: string): Promise<Progress> {
  const saved = await dbGet<Progress>(STORE, keyFor(id))
  return { ...EMPTY, ...(saved ?? {}) }
}

export async function saveFor(id: string, p: Progress): Promise<boolean> {
  return dbPut(STORE, keyFor(id), p)
}
