# Taproot app

The game, the grown-up report and the learner roster. React, TypeScript and
Vite, installable as a PWA and playable offline from the cached question pack.

See the [project README](../README.md) for what Taproot is and how it works.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # runs scripts/check-walls.mjs, then tsc and vite build
```

## Where things are

```
src/App.tsx               screen routing and the game loop's UI
src/game/useGame.ts       drives the engine through each beat of a session
src/game/pack.ts          question pack loading and item selection
src/game/walls.ts         which problem each grade and topic starts from
src/game/learners.ts      per-learner progress, stored in IndexedDB
src/game/useSpeaker.ts    read-aloud;  useVoice.ts  spoken answers
src/game/Trail.tsx        the root, drawn as she digs
src/game/Cascade.tsx      the reward after a repair
src/grove/                the persistent home screen
src/items/                manipulatives: NumberLine, Groups, Balance, Cut, Place
src/parent/               the grown-up report
public/pack.json          the question pack, built by ../agents/pack_baker.py
```

The diagnostic engine is imported as source from `../engine/src` through the
`@engine` alias, so the browser runs exactly the code the evaluations measure.

## Deploying

`vite.config.ts` sets the base path from the host: GitHub Pages serves from
`/Taproot-Nerdy-AI-Hackathon/`, and a build with `VERCEL=1` serves from `/`. The
service worker is registered in `src/sw-update.ts`, not by the plugin, so a new
deploy reaches returning visitors. The build time is shown in the corner of
every screen.
