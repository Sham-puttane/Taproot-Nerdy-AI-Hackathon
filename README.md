# Taproot

**An adaptive K–5 math game that finds the gap three grades below the symptom.**

> A taproot is the one deep root everything above depends on.

A 5th grader who can't add `3/4 + 1/6` is rarely failing 5th-grade fractions. She's
usually missing something from 3rd grade — often that a fraction requires *equal*
parts. Worksheets drill the symptom. Taproot descends the prerequisite graph until
it finds the actual broken skill, names the misconception, and repairs it.

Built for the [Nerdy AI Hackathon](https://hackathon.nerdy.com/) — Prompt 01, K–5 Math.

---

## The loop

**Wall → Descent → Bedrock → Repair → Climb → Return**

| Beat | What happens |
|---|---|
| **Wall** | A problem you genuinely can't do. No points lost — just *"okay, let's find out why."* |
| **Descent** | ~8 questions, each more foundational, camera travelling down the roots. Max-information-gain selection over the prerequisite DAG. |
| **Bedrock** | The real gap, named: *"you're counting the pieces without checking they're equal"* — not "you scored 42%." |
| **Repair** | Practice at bedrock only. Distractors built from *your* misconception. You leave on a mastery threshold, not three lucky answers. |
| **Climb** | Re-ascend the path you dug. Light cascades up the roots. |
| **Return** | The original problem comes back. You solve it. |

The prerequisite graph *is* the game world — roots under a tree. A dead root means
the branch above can't fruit, which a child understands without being told.

## Why it's offline-first

Roughly one in seven US households with school-age children lacks reliable home
internet. The kids furthest behind are disproportionately the kids with the worst
connectivity, and a tutor that stops working when the wifi does is not a tutor for
them.

Heavy AI work happens online and bakes a **Learning Pack** — the subgraph around the
learner's frontier plus a few hundred pre-verified items and hint ladders. Everything
a child touches then runs from IndexedDB with the network off. Telemetry queues and
flushes on reconnect.

## Educational rigor is sourced, not asserted

- **Prerequisite structure** — Student Achievement Partners' [Coherence Map](https://achievethecore.org/page/2801/learn-more-about-the-coherence-map),
  via the [CZI Learning Commons Knowledge Graph](https://learningcommons.org/knowledge-graph/) (CC BY-4.0).
  Not an LLM's guess at what comes before what.
- **Granular skills** — Learning Components authored by Achievement Network.
- **Misconceptions** — the [Eedi corpus](https://www.kaggle.com/competitions/eedi-mining-misconceptions-in-mathematics):
  expert-written distractors mapped to named misconceptions.
- **Nothing unverified reaches a child** — every generated item passes three gates:
  SymPy *executes* the math to prove the key is right and each distractor wrong;
  grade-level/vocabulary checks; and a safety-and-tone judge.

## Does it work?

200 simulated learners, one planted gap each, 51 candidate skills, noisy
answers (10% slip, 25% guess). Every adaptive policy shares the same belief
model and stopping rule -- only the choice of next question differs.

| | Questions | Exact gap | Within 1 prerequisite | Reached a diagnosis |
|---|---|---|---|---|
| **Taproot** | 13.5 | **71.5%** | **88.0%** | 95.0% |
| Curriculum order | 22.8 | 9.5% | 9.5% | 12.0% |
| Random adaptive | 23.7 | 2.0% | 2.5% | 3.0% |
| Worksheet | 20.0 | 0.0% | 0.0% | 0.0% |

Full method and the things that went wrong: [engine/eval/results.md](engine/eval/results.md).

## Status

Day 1 of 16. Honest state:

- [x] Learning Commons KG ingested — 290,718 nodes / 499,498 relationships
- [x] Math prerequisite DAG — 406 standards, 757 edges, verified acyclic
- [x] Fractions cone extracted — **77 nodes, 142 edges, K→grade 5**, max depth 13
- [x] 1,566 learning components attached
- [x] Eedi corpus loaded and cleaned - **234 elementary questions, 560 labelled
      distractors, 253 named misconceptions, 106 constructs**
- [ ] Construct to Learning Component mapping + ChromaDB index
- [ ] Mastery engine (BKT + DAG propagation + info-gain selection)
- [ ] Agents: retriever, generator, verifier, coach, planner
- [ ] The game
- [ ] Offline pack + PWA
- [x] Eval harness vs. baselines - **71.5% exact, 88% within one prerequisite**

## Reproducing the data

```bash
bash scripts/fetch_data.sh          # ~914MB, public, no auth
python ingest/load_kg.py            # -> data/processed/kg_math.json
python ingest/build_dag.py          # -> data/processed/cone_fractions.json
```

Eedi requires accepting the Kaggle competition rules under your own account first.

## Attribution

Knowledge Graph provided by Learning Commons under CC BY-4.0. Learning progressions
derived from the Coherence Map, © Student Achievement Partners. Learning Components
authored by Achievement Network. Misconception data from Eedi.
