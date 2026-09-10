/**
 * Make sure a person actually receives the version we shipped.
 *
 * This has now bitten twice, and the second time was worse than the first,
 * because everything downstream looked like a content bug: instruments
 * "missing", voice "not working", the roster absent -- all of it just an old
 * bundle. The server had index-CBU5jnQT.js and the browser was running
 * index-BRSdHViV.js from days earlier.
 *
 * The auto-injected registration was:
 *
 *     navigator.serviceWorker.register(SW, { scope })
 *
 * Three things missing from that, each enough on its own to freeze a build:
 *
 *   updateViaCache   without 'none', the request for sw.js goes through the
 *                    HTTP cache. GitHub Pages serves it cacheable, so the
 *                    browser can hand back the OLD worker for up to 24 hours
 *                    and never discover that a new one exists at all.
 *   update()         the browser only checks on navigation. A tab left open,
 *                    or reopened from history, may never check.
 *   controllerchange nothing reloaded when a new worker did take over, so the
 *                    page kept running the old code it had already parsed.
 *
 * skipWaiting and clientsClaim were already set and were not enough: they
 * govern what happens once a new worker is FOUND, and the browser was not
 * getting that far.
 */

const SW_URL = `${import.meta.env.BASE_URL}sw.js`

export function keepFresh(): void {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker
    .register(SW_URL, {
      scope: import.meta.env.BASE_URL,
      // The whole fix in one line: always ask the network whether the worker
      // itself has changed, never the HTTP cache.
      updateViaCache: 'none',
    })
    .then((reg) => {
      // Ask immediately rather than waiting for the next navigation.
      void reg.update()

      // And whenever the tab comes back to the foreground, because a child
      // may leave this open for days on a school device.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update()
      })
    })
    .catch(() => {
      // Offline, or the worker cannot be fetched. The app still runs from
      // whatever is cached, which is the point of having it.
    })

  // When a new worker takes control, the page is still executing the old
  // bundle it parsed at load. Reload once -- guarded, because without the
  // guard this loops forever the moment anything goes wrong.
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}
