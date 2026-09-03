/**
 * What survives closing the tab.
 *
 * Until now nothing did, which quietly made "steady progression" impossible:
 * every session started from zero, nothing was ever earned, and the tree the
 * whole product is named after existed only for about ninety seconds.
 *
 * Stored locally, per browser. No account, no sign-up, no server -- an
 * eight-year-old on a shared tablet should not need an email address to keep
 * what she learned, and we should not be collecting one.
 */

import { get as dbGet, put as dbPut } from './db'

const STORE = 'progress' as const
const KEY = 'default'

/** A gap she found and repaired. The collectible, and the record. */
export interface Keystone {
  nodeId: string
  code: string
  /** Child-facing name, stored so the Grove reads correctly offline. */
  name: string
  grade: string
  /** The wall problem that led here. */
  wall: string
  /** How many grades below the wall it turned out to be. */
  depth: number
  earnedAt: number
}

export interface Progress {
  /** node id -> best mastery belief seen. Only ever goes up. */
  mastery: Record<string, number>
  keystones: Keystone[]
  sessions: number
  /** Deepest repair, in grades below the wall. The record worth beating. */
  deepest: number
  lastPlayed: number
}

export const EMPTY: Progress = {
  mastery: {},
  keystones: [],
  sessions: 0,
  deepest: 0,
  lastPlayed: 0,
}

export async function loadProgress(): Promise<Progress> {
  const saved = await dbGet<Progress>(STORE, KEY)
  return { ...EMPTY, ...(saved ?? {}) }
}

export async function saveProgress(p: Progress): Promise<boolean> {
  return dbPut(STORE, KEY, p)
}

/**
 * Fold a finished session into the saved progress.
 *
 * Mastery only ever moves UP. A child who nails a skill in March and has a bad
 * Tuesday in June has not unlearned it, and a tree that dims because she was
 * tired would teach exactly the wrong lesson. The live session still tracks
 * belief honestly in both directions; this is the keepsake, not the model.
 */
export function fold(
  prev: Progress,
  beliefs: Record<string, number>,
  keystone: Keystone | null,
): Progress {
  const mastery = { ...prev.mastery }
  for (const [id, v] of Object.entries(beliefs)) {
    mastery[id] = Math.max(mastery[id] ?? 0, v)
  }
  const keystones = keystone
    ? [...prev.keystones.filter((k) => k.nodeId !== keystone.nodeId), keystone]
    : prev.keystones
  return {
    mastery,
    keystones,
    sessions: prev.sessions + 1,
    deepest: Math.max(prev.deepest, keystone?.depth ?? 0),
    lastPlayed: Date.now(),
  }
}

/** How many skills are lit, out of everything the pack covers. */
export function litCount(p: Progress, threshold = 0.75): number {
  return Object.values(p.mastery).filter((v) => v >= threshold).length
}
