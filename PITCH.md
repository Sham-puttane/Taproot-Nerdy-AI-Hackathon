# Positioning for the Nerdy AI Hackathon

Written 10 Sept 2026. Eight days out. Role being assessed: **AI Product
Engineer** ($200K+ US / $100K LatAm / ₹1 Cr India), judged by Nerdy
engineering leaders, with finalists presenting live at Demo Day.

---

## What they actually said, and what it changes

> "AI isn't a feature bolted on the side here. It's the product."

> Their existing AI layer: **matching, tutoring copilots, adaptive practice,
> session intelligence** — across 3,000+ subjects, 40k+ experts matched on
> 100+ attributes.

> "Challenges mirror actual problems we're solving for millions of learners.
> Your work ships as a portfolio piece — and **might ship to production**."

Three consequences:

1. **Do not pitch Taproot as a maths game with AI in it.** Pitch it in their
   vocabulary. Taproot *is* adaptive practice, it *is* session intelligence,
   and the grown-up report *is* a tutoring copilot. Those are three of the
   four things they say their AI layer does. Use their words.

2. **They are a tutoring company with 40,000 experts.** One device, several
   learners is not a nice-to-have for them — it is Tuesday afternoon. The
   roster and the per-learner grove map onto their business directly.

3. **"Might ship to production" means production judgment is being graded.**
   Cost, failure modes, offline behaviour, what happens when a provider is
   down. This is where the strongest differentiation is, and most entries
   will have nothing to say about it.

---

## The one-sentence pitch

> Every maths app asks *did you get it right*. Taproot asks *why did you get
> it wrong* — and turns the answer into the game.

## The thirty-second version

A fifth grader fails `3/4 + 1/6`. Taproot does not drill fractions. It
descends a real prerequisite graph, finds in ~11 questions that the broken
idea is a **kindergarten** one five grades below, repairs it with a
manipulative, and climbs back to the problem that beat her. Then it shows her
every skill that repair just unblocked.

**73.2% exact, 84.1% within one hop, 10.9 questions — measured across all 16
topic/grade combinations, not a cherry-picked one.** A worksheet scores 0%,
because a worksheet cannot name a cause.

---

## "How is this a game?" — the answer

Do not defend it as a game with rewards bolted on. **The diagnosis is the
mechanic.**

You dig. The root grows through six grade strata. You hit bedrock. You fix it
and watch every skill above it light in sequence. None of that is possible
without the engine underneath — nobody can copy the Cascade without first
building a prerequisite graph and a diagnostic posterior.

And the strongest line, because it is about what was **left out**:

> No points, no XP, no streaks, no timer — deliberately. The meta-analysis on
> gamification finds it lifts autonomy and relatedness but has *minimal impact
> on competence*, and extrinsic rewards can undermine the motivation they are
> meant to create. Competence is the one need a diagnostic engine is built to
> satisfy. So the reward is evidence: real skills, from the real graph, that
> were resting on the thing you just fixed.

Almost nobody else will be able to explain why they omitted something.

---

## "What's the AI?" — three pieces, in this order

**1. A generate–verify agent loop whose judge is not a model.**
`agents/authored.py`. The model proposes textbook-style questions and must
show its working as a computable expression. SymPy executes that expression
and rejects the item unless the author's own arithmetic produces the answer it
claimed. Then structural gates: grade caps, a reading-load budget per grade,
and one that checks every number in the working appears in the question —
which caught seven items like *"How many apples in total?" = 3+2*: arithmetic
SymPy passed, and a child cannot answer.

> **A weak model costs us questions, never correctness.**

That is the sentence. 279 items survived; every rejection is logged with a
reason.

**2. Embedding retrieval over two real corpora.** `ingest/map_constructs.py`
maps Eedi's 253 expert-authored misconceptions onto Common Core Learning
Components with MiniLM: a 0.45 accept floor, a 0.35 review band, and a
hand-scored sample so mapping accuracy is *measured* rather than claimed.
Below the floor it is left unmapped rather than forced.

**3. Data engineering at real scale.** 290,718 nodes and 499,498 relationships
from the CZI Learning Commons graph, reduced to a verified acyclic 101-skill
DAG with 183 prerequisite edges, joined to Eedi, baked into a 1,723-question
offline pack.

**And the runtime AI is not an LLM, on purpose.** The live loop is Bayesian
inference over the DAG with information-gain item selection — an exact
categorical posterior over gap identity. That is the right tool for the job:
it is fast, deterministic, explainable to a parent, and works on a plane. The
LLM is used where it is safe, which is build time, behind a symbolic gate.

**The shipped game makes zero model calls.** No key in the browser, nothing to
leak, nothing to rate-limit, no provider outage that can take down a lesson.
Most entries will demo something that dies without an API key.

---

## Why this is an AI *Product* Engineer submission

The role is not ML research. It is judgment about where AI belongs in a
product. Things to say out loud:

- **I used an LLM where it is safe and something else where it is not.**
  Authoring is a good LLM job; deciding what a child sees is not.
- **The failure mode is degraded yield, not wrong maths.** That is a design
  choice, and it is checkable.
- **I measured where it did *not* work.** Information gain initially tied the
  baselines. A plausible recency prior made accuracy worse (71.5% → 65.5%) and
  was cut — the code is kept, switched off, with the measurement in the
  comment. `sections.ts` could not have moved when question quality improved,
  and I said so rather than claiming the win.
- **Three caches froze the live build in two days** — a service worker without
  `updateViaCache`, a stale-while-revalidate pack, and an IndexedDB pack cached
  forever with no version. Each looked like a content bug. Finding those is
  the job.

That last one is worth telling. Nothing signals production experience like
having debugged a cache you shipped yourself.

---

## The demo, 2:30

| time | beat |
|---|---|
| 0:00 | A real grade-5 fraction problem. She gets it wrong. |
| 0:20 | The descent — the root going down, the *why* line under it |
| 0:50 | **The crossing.** "I picked Big numbers, why am I doing fractions?" Because a decimal IS a fraction. 100% of the time, measured. |
| 1:15 | Bedrock: *"It was never about fractions."* Five grades down. |
| 1:35 | Repair on a manipulative — number line or array |
| 1:50 | **The Cascade.** One kindergarten fix, N skills wake up. |
| 2:05 | The Grove: four trees lit from one repair |
| 2:15 | Parent report: what she was asked, and *why* the wrong answer was wrong |
| 2:25 | The numbers, on screen |

Show the **reject log** if there is a spare five seconds. An engineer watching
will find SymPy refusing a bad item more convincing than any chat box.

---

## Honest gaps, and what to do with them

- **The AI is invisible in a 3-minute video.** This is the real risk. The
  required written description is the only place architecture gets credited —
  the video sells the product, the description sells the engineer. Do not
  treat it as a formality.
- **RAG is build-time only.** True, defensible, and worth stating plainly
  rather than dressing up.
- **62% of questions are still bare arithmetic.** Improving, honest, and worth
  saying before someone finds it.
- **Voice is the browser's Web Speech API**, not a hosted voice agent. Free,
  offline for read-aloud, no key. That is the right call for this product and
  should be said as a choice, not an omission.
