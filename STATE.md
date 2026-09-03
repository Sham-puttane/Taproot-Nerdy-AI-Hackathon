# Taproot — where things stand

Working record for picking this up cold. Last updated at commit 29.

**Live:** https://sham-puttane.github.io/Taproot-Nerdy-AI-Hackathon/
**Repo:** https://github.com/Sham-puttane/Taproot-Nerdy-AI-Hackathon
**Design canvas:** https://claude.ai/code/artifact/0626a3e5-6654-4699-b0e8-dfd5bde73208
**Everything lives on `D:\taproot`** — code, data and caches. C: had 9 GB free.

## What this is

Nerdy AI Hackathon, **Prompt 01 (K–5 math game)**. Submissions close
**Fri 18 Sept 2026, 11:59pm CDT**. Deliverable is a 2–3 min video plus
optional repo and live link.

A K–5 math game that finds the gap *underneath* the one she's stuck on. She
fails a problem; instead of drilling it, the engine descends the prerequisite
graph, names the real broken skill, repairs that, and climbs back.

## The four things that make it defensible

1. **Real prerequisite structure** — Student Achievement Partners' Coherence
   Map via CZI Learning Commons (CC BY-4.0), not an LLM's guess at what comes
   before what.
2. **Real misconceptions** — the Eedi corpus, expert-authored distractors.
3. **Nothing unverified reaches a child** — SymPy *executes* the maths.
4. **Measured, not asserted** — 200 simulated learners against three baselines.

## Numbers as of commit 25

| | |
|---|---|
| Skills in the K–5 graph | 159, **all named for children** |
| Prerequisite links | 277 |
| Pack | 101 nodes, 729 verified items, 17 walls, ~267 KB |
| Item kinds | arithmetic 624, partition 68, compare 24, place 8, cut 5 |
| Topic families | 6 (Measuring 41, Times tables 34, Big numbers 32, Fractions 23, Shapes 21, Counting 8) |
| Tests | 23 engine (vitest) + 35 verifier (pytest) |

### Diagnostic accuracy (200 learners, 51 candidates, noisy answers)

| | Questions | Exact gap | Within 1 hop | Diagnosed |
|---|---|---|---|---|
| **Taproot** | 13.5 | **71.5%** | **88.0%** | 95.0% |
| Curriculum order | 22.8 | 9.5% | 9.5% | 12.0% |
| Random adaptive | 23.7 | 2.0% | 2.5% | 3.0% |
| Worksheet | 20.0 | 0% | 0% | 0% |

Regenerate: `cd engine && npx tsx eval/sweep.ts 200 > eval/results.json &&
python eval/report.py > eval/results.md`

## Layout

```
data/naming.json          three registers per skill: kid / teacher / reteach
data/naming_batch.py      the 104-name authoring pass
ingest/                   Learning Commons + Eedi -> graph, cone, viz
agents/verifier.py        SymPy gate. NO model. 35 adversarial tests
agents/generator.py       deterministic items; misconception = wrong algorithm
agents/pack_baker.py      ALL_WALLS -> one pack covering every offered topic
engine/src/               mastery engine, TS, ONE implementation
  diagnosis.ts            exact posterior over gap identity  <- the good bit
engine/eval/              200-learner sweep + report
app/                      React + Vite game
  src/grove/GroveWide.tsx six trees over the ground they grow in
  src/game/Trail.tsx      the descent as a path
  src/parent/Brief.tsx    parent/tutor report
design/                   .dc.html artboards for the design canvas
```

## Decisions worth not relitigating

- **One engine, two runtimes.** `engine/src` is imported as *source* by both
  the browser and the eval harness. No second implementation, no drift.
- **The posterior, not diffusion.** Knowledge is monotone along the DAG, so a
  question at N is a noisy test of "is the gap in {N} ∪ ancestors(N)?" — a
  plain categorical, updatable in closed form. Replacing damped diffusion with
  it moved accuracy 39% → 71.5%. Diffusion needed damping constants, hop caps
  and anchors purely to patch the approximation.
- **Re-testing a skill is allowed** and worth half that gain. One answer is
  weak evidence against a 25% guess rate.
- **A recency prior was tried and rejected.** Plausible (a fifth grader has
  been in school six years) and measurably worse — 71.5% → 65.5%, still worse
  under realistic planting. Code kept, switched off, measurement recorded in
  `diagnosis.ts`.
- **Manipulatives in Repair, quick items in Descent.** A diagnostic wants
  eight fast reads; dragging for each is exhausting. Repair is where she stays.
- **No score, no timer, no streak.** A countdown measures anxiety. Progression
  is the tree and the keystones.
- **Zero model calls at runtime.** Generation is build-time; the child's loop
  is local engine + cached pack. Offline is therefore literally true.

## Traps that cost real time

- **`npx tsc --noEmit` checks NOTHING here** — root tsconfig is `"files": []`
  with project references. Use `npm run build` (`tsc -b`).
- **Bash heredocs eat backslashes.** `\\b` became a literal 0x08 backspace and
  a regex silently matched nothing. Use the Write tool for anything with
  escapes.
- **A `str.replace` that doesn't match fails silently** — twice it left
  computed code unused. Verify the effect, not the exit code.
- **Two modules opening the same IndexedDB at the same version**: whichever
  ran first won, the other's store never existed, writes threw into a silent
  catch. All progress vanished on reload while looking fine all session.
  `app/src/game/db.ts` owns the database now.
- **The Pages workflow cancels in-flight runs** (concurrency group), so a
  quick follow-up push can cancel the previous deploy. Check `gh run list`.
- **The service worker used to serve a stale bundle forever.** Without
  `skipWaiting`/`clientsClaim` a new worker sat in "waiting" until every tab
  on the origin closed, and a hard reload did NOT help because the OLD worker
  answered the request. Three shipped commits were invisible on the live site
  while every push reported success. Fixed in `app/vite.config.ts`; a
  returning visitor now needs one reload, then never again.
- **Identical question stems across nodes read as a frozen app.** One stem
  appeared verbatim on ten skills.

## Open, in the order I'd do them

1. **A real measuring instrument.** MD skills currently serve whole-number
   arithmetic as a placeholder — reachable, not right. `2.MD.A.2` deserves it
   most: "bigger unit, smaller number" is the denominator idea three years
   early.
2. **More instruments** — Fold (equivalence), Groups, Balance, Blocks. 624 of
   729 items are still multiple choice.
3. **Climb cascade** — understated; should be light travelling up the chain.
4. **Demo video + README** — the actual submission, and unstarted.

## The four screens, all now full-bleed and in one visual language

| | |
|---|---|
| `grove/GroveWide.tsx` | six trees over the ground they grow in |
| `game/PickWide.tsx` | grade = the soil layer you tap; topic = the tree |
| `game/Trail.tsx` | ONE svg: strata, a single root path, beads on it |
| `parent/Brief.tsx` | a document, not a garden — dark header, two columns |

`game/Reward.tsx` fires on every answer: a fruit in the colour of the grade it
was earned in, never points and never a streak, because the same fruit is in
the canopy and on the Grove tomorrow. A miss is acknowledged, never penalised.

## Feedback still unaddressed

- The slicer only appears at Repair, so a casual play-through never sees it.
- The bedrock screen ("Here's the tricky bit") is the emotional payoff of the
  whole descent and is still a plain card in a wide empty column.
