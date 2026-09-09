# The plan that solves all of it

Written 9 Sept 2026. Deadline **Fri 18 Sept, 11:59pm CDT** — 9 days.

Nothing here is a guess. Every cause below was traced with
`engine/eval/trace.ts`, which prints the real item sequence a child sees,
chosen by the real selection policy. Reproduce any row:

```
cd engine && npx tsx eval/trace.ts 4.OA.A.3 3
```

---

## Every problem, traced to its cause

| # | What you saw | Traced cause | Fix |
|---|---|---|---|
| 1 | "Rooting down, questions got more complex" | Descending `5.NF.A.1`, grade falls `5→K` while words per stem rise `5→19`. Stem length is bimodal: 632 items at 5 words, then a jump to 15–20, nothing between. | Reading-load budget per grade + rewrite the 40 verbose stems |
| 2 | "Every word problem ends up in big numbers" | It doesn't. `gen_whole` emits `a op b = ?` for **any** OA/NBT skill, so every family serves identical arithmetic. **11 of 11** word-problem skills serve bare sums — `4.MD.A.2` "Measuring word problems" → `6 + 11 = ?` | Real word-problem generator, contexts per family |
| 3 | "Only plus and multiplication questions" | **624 of 729 items (86%)** are `a op b = ?`. Whole pack has **247 distinct stems**. | Same generator rewrite + instruments |
| 4 | "Not interactive, only the root growing" | **13 of 729 items (1.8%)** are hands-on. Only 2 instruments exist (`Cut`, `Place`), and `cut` has 5 items. | 3 new instruments — sized below |
| 5 | "Parent report isn't informative — should say wrong *because* why" | `DescentStep` records `{nodeId, correct, beliefBefore, beliefAfter, expectedGain}`. **It never records which item was shown or which option she picked.** The report literally cannot say why. | Carry `itemId` + `chosenIndex` through the engine |
| 6 | Misconceptions are thin | **253 ingested, 3 executable.** 528 items carry one generic label. Generic items can only carry generic errors. | Agentic misconception→algorithm pipeline |
| 7 | "I thought this was on Vercel?" | GitHub Pages. `vercel.json` exists, no `.vercel` dir — never linked. Import needs an OAuth click only you can do. | You click once; I wire the rest |
| 8 | "The UI needs to be better" | Bedrock screen (the payoff) is a plain card in a wide empty column; no Dig gesture; beads aren't tappable. | UI pass, day 7 |

### One more the trace caught that you didn't mention

Grade order isn't monotone: `4.OA.A.3` descends `4 → 2 → 4 → 1 → 0`. Correct
for information gain, but to a child it reads as the app jumping around. Fixed
by a tie-break that prefers the shallower grade when gain is within ~5%.

---

## Instruments, sized against the real graph

Keyword-matched against all 101 pack nodes:

| Instrument | Nodes it can serve | Share |
|---|---|---|
| **Number line** (place, compare, round, tenths) | 38 | 38% |
| **Balance** (add, subtract, bonds, make-ten) | 34 | 34% |
| **Groups** (arrays, multiply, divide, equal share) | 31 | 31% |
| Fold (equivalence, partition) | 12 | 12% |
| Blocks (base ten, regroup) | 4 | 4% |

**Those top three cover 79% of the pack** (80 of 101 nodes match at least one).
Build three, and "not interactive" is answered structurally rather than
cosmetically. Fold and Blocks are not worth the days.

---

## What the evidence says about making this interactive

Researched rather than guessed, because "add more gimmicks" and "help kids
learn" pull in opposite directions more often than people expect.

### 1. Three representations have strong evidence, and they are named

The IES What Works Clearinghouse practice guides recommend a specific, small
set: **number lines, arrays, and strip diagrams**, and single out the number
line as *"a central representational tool in teaching fraction concepts from
the early grades onward."*

That is not a general encouragement to be visual. It is a list of three. And
it maps onto our graph almost exactly:

| WWC representation | Our instrument | Nodes it serves | Status |
|---|---|---|---|
| **Number line** | `Place`, needs extending | **38** | 8 items on 1 skill |
| **Arrays** | Groups — does not exist | **31** | nothing |
| **Strip diagrams** | `partition` bar | 68 items, 20 skills | exists, works |

So the two instruments to build are the two the evidence names and we lack.
Fold (12 nodes) and Blocks (4) are not on the WWC list and are not worth a day.

### 2. Manipulatives help RETENTION more than transfer

The meta-analysis of teaching with concrete manipulatives found *moderate to
large* effects on retention but only *small* effects on problem solving,
transfer and justification.

Read honestly, that means dragging things is not automatically better
learning. It earns its place for **remembering the repaired skill**, which is
exactly and only what Repair is for. It does not justify making the whole game
draggable.

### 3. Perceptual richness actively HURTS — this one changes a design decision

Kaminski, Sloutsky and Heckler found that irrelevant perceptual detail
distracts children away from the concept — the seductive-details effect.
Concrete representations can *hinder* transfer because they bind an idea to
one context; idealised representations strip detail to expose the structure,
and transfer better.

**This overrides an instinct we both had.** A photorealistic pizza with
pepperoni would test worse than a plain bar. Our existing `Cut` slicer already
uses a spare rectangle — that is correct and stays. The instruments get shape
and colour and nothing else: no textures, no cartoon food, no characters
inside the manipulative.

### 4. Concreteness fading — and we already have the loop for it

The strongest single finding for us: transfer improves when instruction moves
**concrete → representational → abstract** rather than staying at any one.

Taproot's loop is *already that shape* and nobody designed it that way:

```
  Repair   ->   Climb          ->   Return
  concrete      representational     abstract
  drag it       see it drawn         the original symbols
```

Making that deliberate costs almost nothing and is a real pedagogical claim
for the submission: the manipulative appears at Repair, the same idea appears
as a diagram on the way up, and the child finishes on the exact symbolic
problem that beat her. Right now Repair and Climb both serve whatever item
happens to exist, so the fade is accidental. Enforcing it is a selection rule,
not new UI.

### What this means we build

1. **Number line instrument** (WWC-named, 38 nodes) — drag a marker to a value,
   place a fraction, compare two points. Extends `Place`.
2. **Array/Groups instrument** (WWC-named, 31 nodes) — build rows and columns,
   see multiplication as area.
3. **Concreteness-fading selection rule** — Repair prefers hands-on, Climb
   prefers a diagram item, Return uses the original symbolic wall item.
4. **Keep manipulatives visually spare.** Shape and colour only.

Interactivity that is NOT about the maths goes in the UI pass and is kept
cheap: the Dig gesture, tap-a-bead-for-why, the bedrock reveal. Those serve
autonomy and pacing, which the gamification meta-analysis says gamification
actually does improve, unlike competence.

### Sources

- IES WWC, *Assisting Students Struggling with Mathematics: Intervention in
  the Elementary Grades* — https://ies.ed.gov/ncee/wwc/PracticeGuide/26
- IES WWC, *Developing Effective Fractions Instruction for K-8* —
  https://ies.ed.gov/ncee/wwc/practiceguide/15
- Carbonneau, Marley & Selig, *A meta-analysis of the efficacy of teaching
  mathematics with concrete manipulatives* — https://eric.ed.gov/?id=EJ1007941
- Fyfe, McNeil, Son & Goldstone, *Concreteness fading in mathematics and
  science instruction: a systematic review* —
  https://link.springer.com/article/10.1007/s10648-014-9249-3
- Kaminski, Sloutsky & Heckler, *Do children need concrete instantiations to
  learn an abstract concept?* —
  https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/1/56827/files/2018/06/Kaminski-Sloutsky-Heckler-CogSci-2006-2kl3ovl.pdf

---

## Dependency map

```
  DAY 1  ┌─ reading-load budget ────────────────┐  no model needed
         └─ engine: carry itemId + chosenIndex ─┘  no model needed
                        │
  DAY 2  ┌─ OpenRouter client (build-time only) ┐
         │                                       │
  DAY 3  ├─ word-problem generator ──────────────┤ SymPy gates both
         └─ misconception → wrong algorithm ─────┘
                        │
  DAY 4  ┌─ rebake pack + re-run sections.ts ────┐ regression gate
         └─ parent report v2 "wrong BECAUSE" ────┘ needs day 1 + day 3
                        │
  DAY 5-6  three instruments (independent of everything above)
                        │
  DAY 7    UI pass: bedrock payoff, Dig gesture, tap-a-bead
                        │
  DAY 8    written description + README + Vercel + buffer
  DAY 9    video
```

**Critical path: 1 → 2 → 3 → 4 → 9.** Instruments and UI are parallel and
cuttable. Days 1 and 5–7 need no API key at all.

---

## The schedule

### Day 1 — fix the worst bug, no model required
- Reading-load budget: max words by grade (K–1: 8, 2–3: 12, 4–5: 18).
  Rewrite the ~40 verbose partition/cut stems to fit. *Solves #1.*
- Engine change: `Session.answer(nodeId, correct, itemId, chosenIndex)`;
  `DescentStep` carries them. *Unblocks #5.*
- Monotone tie-break in selection. *Solves the bonus finding.*
- Re-run the 23 engine tests + `sections.ts` to prove accuracy didn't move.

### Day 2 — the pipeline, gated
- One `agents/llm.py` interface, key from `OPENROUTER_API_KEY`, fails loudly
  if absent — never silently ships unverified items.
- Extend `verifier.py`: word problems must have consistent units, a unique
  answer, and numbers inside the grade cap.

### Day 3 — generate, verify, reject *(time-boxed — this is the risk)*
- Word-problem stems with real contexts per family. *Solves #2, #3.*
- Executable wrong algorithms for the 253 misconceptions; SymPy runs both the
  right and wrong algorithm and rejects anything that doesn't produce a
  distinct, plausible distractor. *Solves #6.*
- **Whatever is verified by end of day 3 ships. The rest keeps today's items.**
  Failure mode is "fewer new items", never "wrong maths".

### Day 4 — rebake + the report
- Rebake pack, re-run `sections.ts`; accuracy must not regress.
- Parent report v2: per question — what was asked, what she answered, and
  *why that answer* by name. "She answered 5/6 because she added the
  denominators" instead of ✗. *Solves #5.*

### Days 5–6 — the two instruments the evidence names
**Number line** (WWC's central tool for fractions, 38 nodes) and
**Array/Groups** (WWC-named, 31 nodes), plus the **concreteness-fading
selection rule** so Repair is concrete, Climb is representational and Return
is abstract. Manipulatives stay visually spare — perceptual richness measurably
hurts transfer. Balance is dropped: it is not on the WWC list, and strip
diagrams (which are) already exist as the partition bar. *Solves #4.*

### Day 7 — UI pass
Bedrock screen payoff, Dig gesture, tap-a-bead-for-why. *Solves #8.*

### Day 8 — submission plumbing
Written description (a **required** field), README refresh, Vercel, buffer.

### Day 9 — video

---

## Vercel

I cannot import the project — it needs an OAuth grant on your account. **You
do this once:**

1. https://vercel.com/new → Import `Sham-puttane/Taproot-Nerdy-AI-Hackathon`
2. Framework: **Other**. `vercel.json` already sets the build command, output
   directory (`app/dist`) and the SPA rewrite.
3. Deploy.

Then tell me the URL and I'll set `BASE` to `/` for Vercel and keep the Pages
build working, so both hosts stay valid.

**The OpenRouter key does NOT belong in Vercel.** Generation is a build-time
step that produces `pack.json`, which is committed. If the key lived in Vercel
every deploy would make model calls — slow, fragile, and it would put the key
on a build server for no benefit. Set it locally instead:

```
setx OPENROUTER_API_KEY "sk-or-..."
```

New terminal after that. The shipped game still makes **zero** model calls, so
the live demo cannot break, cannot leak a key, and still works offline.

---

## Housekeeping (day 8, 20 minutes)

- Delete unused deps: `chromadb`, `fastapi`, `uvicorn`, `duckdb`, `pydantic`,
  `python-dotenv`, and the empty `api/`. `anthropic`/`langgraph` become real
  on day 3. Right now a judge greps for them, finds nothing, and the agentic
  claim looks like scaffolding.
