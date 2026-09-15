# Submission: copy each block into the form

Every figure below was read out of the repo on 14 Sept 2026, not remembered,
and a script checks them. If anything changes before you submit, re-run the
check rather than trusting this file.

---

## Your name

Sham Puttane

## Email

sputtane@asu.edu

## Which prompt?

**Prompt 01, K–5 Math Game**

## Code repo

https://github.com/Sham-puttane/Taproot-Nerdy-AI-Hackathon

## Live demo

https://sham-puttane.github.io/Taproot-Nerdy-AI-Hackathon/

---

## What did you build?

*(paste from here down. The form asks for what it does, how you built it, and
what you'd do next, so it is written in that order)*

---

**Taproot: adaptive practice that finds the gap three grades below the
symptom.**

### What it does

A fifth grader fails `3/4 + 1/6`. Every maths app I have used responds by
drilling fractions. She is rarely failing fractions. She is usually missing
something from second or third grade that fractions rest on.

Taproot treats the failed problem as a symptom. It descends a real
prerequisite graph, asking about eleven questions chosen to maximise
information about *where* the break is, names the actual broken skill in
language a child can read, repairs it with a manipulative, and climbs back to
the problem that beat her. Then it shows her every skill that one repair just
unblocked.

Measured across all 16 topic/grade combinations the game offers, not one
cherry-picked wall, it names the exact broken skill **73.2%** of the time and
lands within one hop **84.1%** of the time, in **10.9 questions**. On the wall
used for baseline comparison, against three alternatives sharing the same
belief model and stopping rule: curriculum order 9.5%, random adaptive 2.0%, a
worksheet 0%. A worksheet scores zero because a worksheet cannot name a cause.

It is built for the child who is actually behind, and for the adults around
her:

- **It speaks and it listens.** Every question is read aloud by default, and
  she can answer out loud instead of tapping. The children furthest behind in
  maths are very often behind in reading too, so a word problem she cannot
  read measures decoding rather than numeracy.
- **One device, several children.** Each learner gets their own grove, picked
  by colour and initial so a child who cannot yet read can find her own. For a
  tutoring company that is not an edge case; it is a tutor's afternoon.
- **A report that says why.** For a parent or tutor, every question she was
  asked, and for each wrong answer what that particular answer means ("adds
  one to each digit instead of ten"), not a tick. It stays after the session
  ends, because that is when a grown-up opens it.

Three things fell out of the diagnosis that I did not expect and which turned
out to be the most interesting parts of the product:

- **The descent crosses subjects, and that is correct.** Grade-5 "Big numbers"
  is decimals, whose prerequisite closure holds 16 fraction skills, because a
  decimal *is* a fraction. It crosses into fractions 100% of the time. It
  looked like a bug until I measured it; now tapping the point on the root
  where it changed subject explains why.
- **One repair feeds several topics.** Skills belong to every corridor that
  rests on them, so fixing one kindergarten idea visibly lights four trees on
  the home screen.
- **The reward had to be evidence, not points.** There is no score, no XP, no
  streak and no timer, deliberately: gamification meta-analyses find extrinsic
  rewards can undermine the motivation they are meant to create and have
  minimal effect on *competence*, which is the one need a diagnostic engine is
  built to satisfy. So the payoff is a list of real skills, from the real
  graph, that were standing on the thing she just fixed.

### How I built it

**Data.** 290,718 nodes and 499,498 relationships from the CZI Learning
Commons knowledge graph (Common Core plus Student Achievement Partners'
Coherence Map), reduced to a verified acyclic **159-skill K–5 graph with 277
prerequisite edges**, every skill given a child-facing name. Joined to the
Eedi "Mining Misconceptions in Mathematics" corpus (560 records, 106
constructs, **253 expert-authored misconceptions**) via embedding retrieval
(MiniLM) with a 0.45 accept floor, a 0.35 review band, and a hand-scored
sample so the mapping accuracy is measured rather than claimed. Anything below
the floor is left unmapped rather than forced.

**Content, and the part I would defend hardest.** Questions are proposed by an
LLM (Groq, with OpenRouter as fallback) and gated by SymPy. A generated
question must show its working as a computable expression; SymPy executes that
expression and rejects the item unless the author's own arithmetic produces
the answer it claimed. Each wrong option carries its own reason, which is what
the report quotes back. Further gates cover grade-appropriate denominators, a
reading-load budget per grade, and, added after reading the output rather than
the yield, a check that every number in the working actually appears in the
question. That last one caught seven items like *"How many apples in total?"
= 3+2*, which SymPy passes and a child cannot answer.

> The consequence is the design: **a weak model costs us questions, never
> correctness.** The failure mode is degraded yield, and it is checkable.

The shipped pack is **1,331 questions across 9 kinds**, 838 distinct stems,
325 model-authored and verified, **418 hands-on**, and **18% bare arithmetic**,
down from 86% when a deterministic generator was the only source. The
manipulatives are the representations the IES What Works Clearinghouse
practice guides actually name (number line, arrays, strip diagrams), plus a
balance aimed at one documented misconception: that "=" means "here comes the
answer" rather than "these are the same". It only levels when both sides are
equal, so the apparatus teaches it instead of a correction.

**Engine.** The runtime is deliberately **not** an LLM. It is an exact
categorical posterior over gap identity: because knowledge is monotone along
the DAG, a question at node N is a noisy test of "is the gap in N or above
it", which is a plain categorical updatable in closed form. Items are selected
by mutual information. Replacing damped belief diffusion with this took
accuracy from 39% to 71.5%; diffusion had needed damping constants, hop caps
and anchors purely to patch the approximation. One TypeScript implementation
is imported as source by both the browser and the Node eval harness, so they
cannot drift.

**Voice.** Both directions use the browser's own Web Speech API, so there is
no key and no voice vendor. Read-aloud is on by default and rewrites maths for
the ear, so "1/2 + 2/3 = ?" is spoken as fractions rather than "one slash
two". Spoken answers are matched against the options on screen rather than
parsed as free speech, including number words and spoken fractions ("three
quarters" becomes 3/4), so the recogniser only has to get close. One honest
limit: speech recognition in Chrome sends audio to Google and needs a
connection, so the microphone hides itself when it cannot work and every
question stays answerable by tapping.

**Several learners, no accounts.** Progress, keystones and each learner's last
session report are stored per learner in the browser, keyed by a local id.
There is no sign-up and nothing is sent anywhere: a first name on a shared
tablet is a name a stranger can read, so it never leaves the device. Removing
a learner does not quietly delete their history, and the first learner on a
device that already has progress inherits it rather than starting from zero.

**Production posture.** The shipped game makes **zero model calls**. All
generation is build-time, so there is no key in the browser, nothing to leak,
no rate limit, and no provider outage that can take down a lesson. The core
game works offline from the cached pack.

**Measurement, including where it lost.** `engine/eval/sections.ts` runs every
offerable wall so a weak section cannot hide in an average. A plausible
recency prior (a fifth grader has been in school six years, so recent gaps
should be likelier) was implemented, measured, made things *worse* (71.5% to
65.5%), and is switched off with the measurement recorded in the code. When
question quality improved, that eval did not move, because it drives the graph
and not the item text; I said so rather than claiming the win.

48 verifier tests, 23 engine tests, and a build-time gate that fails the build
if the wall table ever offers a child a standard above her own grade, which it
had been doing for three of nineteen offerings until I checked.

### What I'd do next

1. **Close the content gap honestly.** 18% of questions are still the generic
   fallback, and only **3 of the 253 retrieved misconceptions are executable
   as wrong algorithms**, the single biggest untouched lever on distractor
   quality. The pipeline exists; it needs passes, not new ideas.
2. **Tutor-facing session intelligence.** Each learner's report already
   persists with what she was asked and *why* each wrong answer was wrong. The
   obvious next step for Nerdy specifically is a pre-session brief across a
   tutor's whole roster: who to see, what to open with, what not to waste time
   on.
3. **Validate on real learners.** Every accuracy number here is against
   simulated learners with slip/guess noise. That is honest and it is not the
   same as evidence, and I would rather say so than imply otherwise.
4. **Spanish.** Read-aloud and voice answers already run on the browser's
   speech APIs, so the marginal cost is translating 159 skill names and the
   item templates and switching the recogniser's language. Small, and material
   for a large part of the K–5 population.

---

## Anything else (optional uploads)

- `engine/eval/sections.md`: per-section accuracy table
- `PLAN.md`: every problem traced to its cause with `engine/eval/trace.ts`
- `STATE.md`: the working record, including the traps that cost real time
