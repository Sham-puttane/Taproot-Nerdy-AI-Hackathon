/**
 * One place that opens the database.
 *
 * There used to be two: pack.ts opened `taproot` v1 and created a `packs`
 * store, and progress.ts opened the same name at the same version and expected
 * a `progress` store. Whichever ran first won, `onupgradeneeded` never fired
 * for the second, and every save threw NotFoundError into a silent catch --
 * so progress appeared to work all session and vanished on reload. The
 * "gamified progression" the whole design rests on was quietly a no-op.
 *
 * Two rules came out of that, and they are why this file exists:
 * every store is declared in one upgrade path, and a failed WRITE is reported
 * rather than swallowed. Losing a keepsake silently is worse than a console
 * error nobody reads, because at least the error is findable.
 */

const NAME = 'taproot'
const VERSION = 2
export const STORES = ['packs', 'progress'] as const
export type StoreName = (typeof STORES)[number]

let cached: Promise<IDBDatabase | null> | null = null

export function openDb(): Promise<IDBDatabase | null> {
  if (cached) return cached
  cached = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(NAME, VERSION)
    } catch {
      return resolve(null)
    }
    req.onupgradeneeded = () => {
      const db = req.result
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
      }
    }
    req.onsuccess = () => {
      const db = req.result
      // If an older build left the DB without a store we need, the version
      // bump above will have added it. If it somehow still is not there,
      // fail loudly rather than pretending to save.
      const missing = STORES.filter((s) => !db.objectStoreNames.contains(s))
      if (missing.length) {
        console.error('[taproot] missing object stores:', missing)
      }
      resolve(db)
    }
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return cached
}

export async function get<T>(store: StoreName, key: string): Promise<T | null> {
  const db = await openDb()
  if (!db || !db.objectStoreNames.contains(store)) return null
  return new Promise((resolve) => {
    try {
      const r = db.transaction(store, 'readonly').objectStore(store).get(key)
      r.onsuccess = () => resolve((r.result as T) ?? null)
      r.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function put(
  store: StoreName,
  key: string,
  value: unknown,
): Promise<boolean> {
  const db = await openDb()
  if (!db || !db.objectStoreNames.contains(store)) {
    console.error('[taproot] cannot save: store unavailable', store)
    return false
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(value, key)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => {
        console.error('[taproot] save failed', store, tx.error)
        resolve(false)
      }
      tx.onabort = () => resolve(false)
    } catch (e) {
      console.error('[taproot] save threw', store, e)
      resolve(false)
    }
  })
}
