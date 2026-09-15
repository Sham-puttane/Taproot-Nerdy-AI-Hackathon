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
import type { PackNode } from './pack'

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
  /**
   * The report from her most recent session, kept after it ends.
   *
   * The per-question detail used to live only in the live engine, so a
   * parent opening the report after her child finished -- which is when a
   * parent opens it -- got "No session open right now" and nothing else.
   */
  lastSession?: SavedSession
}

/** The shape the grown-up report reads, frozen at the end of a session. */
export interface SavedSession {
  wall: PackNode | undefined
  best: { nodeId: string; confidence: number } | null
  runnersUp: { nodeId: string; confidence: number }[]
  path: string[]
  asked: {
    nodeId: string
    correct: boolean
    stem?: string
    chosen?: number
    becauseOf?: string
  }[]
  questionCount: number
  endedAt?: number
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
  session?: SavedSession,
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
    // fold rebuilds Progress field by field, so anything not named here is
    // dropped on every save. Carried explicitly, not assumed.
    lastSession: session ?? prev.lastSession,
  }
}

/** How many skills are lit, out of everything the pack covers. */
export function litCount(p: Progress, threshold = 0.75): number {
  return Object.values(p.mastery).filter((v) => v >= threshold).length
}
