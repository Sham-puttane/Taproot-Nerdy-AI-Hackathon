# Taproot: where things stand

Working record for picking this up cold. Last updated 14 Sept 2026, at
submission.

**Live:** https://sham-puttane.github.io/Taproot-Nerdy-AI-Hackathon/
**Repo:** https://github.com/Sham-puttane/Taproot-Nerdy-AI-Hackathon
**Everything lives on `D:\taproot`**: code, data and caches.

## What this is

Nerdy AI Hackathon, **Prompt 01 (K–5 maths game)**. Submissions close
**Fri 18 Sept 2026, 11:59pm CDT**.

A K–5 maths game that finds the gap *underneath* the problem a child is stuck
on. She fails a problem; instead of drilling it, the engine descends the
prerequisite graph, names the real broken skill, repairs it hands-on, and
climbs back. See `README.md` for the product and architecture.

## What makes it defensible

1. **Real prerequisite structure.** Student Achievement Partners' Coherence
   Map via CZI Learning Commons, not a model's guess at what comes before what.
2. **Real misconceptions.** The Eedi corpus, expert-authored distractors.
3. **Nothing unverified reaches a child.** SymPy executes the maths.
4. **Measured, not asserted.** Simulated learners against three baselines, and
   every section the game offers measured separately.

## Numbers

| | |
|---|---|
| K–5 graph | 159 skills, all named for children, 277 prerequisite edges |
| Pack | 101 skills, 17 walls, **1,331 items**, 838 distinct stems, ~400 KB |
| Item kinds | word 325, compare 312, arithmetic 234, numberline 160, groups 140, balance 112, partition 42, place 3, cut 3 |
| Model-authored, verified | 325 |
| Hands-on | 418 |
| Bare arithmetic | 18% (was 86% when the deterministic generator was the only source) |
| Tests | 23 engine (vitest), 48 verifier (pytest) |

### Diagnostic accuracy, simulated learners

Every section the game offers (16 walls, 150 trials each), `eval/sections.md`:

| exact | within 1 | diagnosed | questions |
|---|---|---|---|
| **73.2%** | **84.1%** | 96% | 10.9 |

Against baselines on `5.NF.A.1` (200 learners, same belief model and stopping
rule), `eval/results.md`:

| | Questions | Exact | Within 1 |
|---|---|---|---|
| **Taproot** | 13.5 | **71.5%** | **88.0%** |
| Curriculum order | 22.8 | 9.5% | 9.5% |
| Random adaptive | 23.7 | 2.0% | 2.5% |
| Worksheet | 20.0 | 0% | 0% |

## Layout

```
data/naming.json        kid / teacher / reteach wording per skill
ingest/                 Learning Commons + Eedi -> graph, cone, naming
agents/llm.py           Groq first, OpenRouter fallback, one code path
agents/authored.py      LLM proposes questions, SymPy judges; merges, never overwrites
agents/instruments.py   deterministic manipulative items, rotated per skill
agents/generator.py     deterministic fallback items
agents/verifier.py      the SymPy gate. No model. 48 tests
agents/pack_baker.py    merges everything into one verified pack
engine/src/             diagnostic engine, one implementation for browser and eval
engine/eval/            sections, sweep, trace, demo_path, demo_script
app/                    React game, grown-up report, learner roster
app/scripts/check-walls.mjs  build gate: no wall above the child's grade
design/                 .dc.html artboards
```

## Decisions worth not relitigating

- **One engine, two runtimes.** `engine/src` is imported as source by the
  browser and the eval harness. No drift.
- **The posterior, not diffusion.** A question at N is a noisy test of "is the
  gap at or above N", a plain categorical updated in closed form. Replacing
  diffusion with it moved accuracy 39% to 71.5%.
- **Re-testing a skill is allowed**, and worth half that gain.
- **A recency prior was tried and rejected**: 71.5% to 65.5%. Code kept,
  switched off, measurement in `diagnosis.ts`.
- **Zero model calls at runtime.** Generation is build-time.
- **Concreteness fading as a selection rule.** Descent prefers quick abstract
  items, Repair prefers manipulatives, Climb prefers pictorial. A preference,
  not a precondition: a skill with only one tier still works.
- **No score, no timer, no streak.** The reward is the Cascade and the Grove.
- **The deterministic generator is a floor.** Where real content exists it keeps
  three slots, not eight.
- **Voice uses the browser's Web Speech API.** No key, no vendor. Recognition
  in Chrome needs a network; the mic hides itself when it cannot work.
- **Learners are local.** Per-learner IndexedDB keys, no accounts, names never
  sent. Removing a learner keeps their history.

## Traps that cost real time

- **`npx tsc --noEmit` checks nothing here.** Use `npm run build` (`tsc -b`).
- **Bash heredocs eat backslashes.** Twice a `\b` regex silently lost its word
  boundaries. Anything with escapes goes through a file tool.
- **Literal `\n` anchors do not match CRLF files** and the patch reports
  success. Use `\r?\n` in regexes, and verify the effect.
- **Case-insensitive filesystem.** `Progress.tsx` resolved to `progress.ts`.
- **Three caches froze the live build**, each looking like a missing feature:
  a service worker registered without `updateViaCache`, a pack.json served
  stale-while-revalidate, and an IndexedDB pack cached forever with no
  revalidation. All fixed. The build time is now in the corner of every screen;
  read it before debugging anything.
- **`authored.py` used to overwrite its output**, so a run for one family
  deleted every other family's questions. It merges now and prints before and
  after counts.
- **Instrument generators sliced a fixed list**, so every skill at a grade got
  identical questions ("Which sign belongs between 1/2 and 1/4?" on 77 skills).
  They rotate per skill now.
- **`fold()` rebuilds Progress field by field**, so any new field is dropped on
  every save unless named there.
- **Answering everything wrong never reaches arrays.** It drives the descent to
  counting and shapes. `eval/demo_script.ts` computes exact answer sequences.
- **Vercel** (`taprrot.vercel.app`) has never picked up a push and still serves
  a pre-fix bundle that renders blank. The code is correct for Vercel
  (`VERCEL=1` sets the base path); the project setting is not. GitHub Pages is
  the live link.

## Open, in the order I'd do them

1. **Validate on real learners.** Every number is simulation.
2. **Executable misconceptions.** 3 of 253 are wrong algorithms; the biggest
   untouched lever on distractor quality.
3. **Close the fallback gap.** 18% of items are still generic arithmetic.
4. **Tutor pre-session brief** across a roster, built on the saved reports.
5. **Spanish.** Translate skill names and templates, switch recogniser language.
6. **The Dig gesture.** Drag through the soil to reveal the next question.
