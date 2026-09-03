import { useEffect, useState } from 'react'

/**
 * Whether the browser currently has a network.
 *
 * The game does not need one -- the engine is local and every question is in
 * the cached pack -- so this is not a warning. It is a reassurance, and it is
 * the only honest way to prove the claim: a child who loses signal halfway
 * through a diagnosis keeps going, and can see that she is.
 *
 * navigator.onLine is famously optimistic (it means "there is an interface",
 * not "the internet works"), which is fine here: we only ever use it to show a
 * badge, never to gate anything.
 */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(
    typeof navigator === 'undefined' ? false : !navigator.onLine,
  )
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return offline
}
