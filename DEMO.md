# Demo script

Computed with `engine/eval/demo_script.ts`, not found by hunting. The engine
is deterministic given the answers, so these routes are the route — not a
sample of what might happen.

```
cd engine && npx tsx eval/demo_script.ts groups
```

Re-run it after any pack rebake; the routes move when the content does.

---

## Before you record

1. **Hard reload once** (Ctrl+Shift+R) and check the **build stamp** in the
   bottom-left corner is today's. Three separate caches have frozen this app
   on an old build; the stamp is how you know.
2. **Grove → For grown-ups → remove the learner**, or use a fresh InPrivate
   window, so the Grove starts empty and the trees visibly grow.
3. Voice is **on** by default (🔊 top right). Leave it on — it reads every
   question aloud, which is worth showing.

---

## The words

Written to be read aloud at about 150 words a minute — unhurried. Word counts
are given so you can check the timing instead of hoping. Nothing here needs
to be memorised: it needs to be true, and to be said while the right thing is
on screen.

**Total spoken: 380 words ≈ 2:32.** The numbers card at the end is silent.

---

### 0:00 — Cold open, over the Grove *(38 words, ~15s)*

> "This is Taproot. A fifth grader gets a fractions question wrong.
>
> Every maths app I have used answers that by giving her more fractions. But
> she is usually not failing fractions. She is missing something from three
> grades earlier that fractions are built on."

*Do not click yet. Let the six trees sit on screen while you say it.*

---

### 0:15 — What it does *(34 words, ~14s)*

Click **Start digging → Grade 5 → Fractions**.

> "So instead of drilling the thing she got wrong, Taproot treats it as a
> symptom, and goes looking for the cause. It asks about ten questions, each
> one chosen to narrow down where the break actually is."

---

### 0:29 — The first question *(22 words, ~9s)*

`1/2 + 2/3 = ?` — answer **1**.

> "She gets it wrong. Nothing is scored, nothing is lost. It just says: okay,
> let's find out why."

*Point at "no score · no timer" under the progress bar.*

---

### 0:38 — How it works, said once, while it happens *(56 words, ~22s)*

Answer **WRONG** each time. The root grows down the strata.

> "Underneath this is a real prerequisite graph — Common Core, from the
> Coherence Map, two hundred and ninety thousand nodes reduced to a hundred
> and fifty-nine K-to-5 skills. Each question is picked for maximum
> information about which skill is broken. Watch the root: it is going *down*
> through the grades, and the line at the bottom says why each move happened."

---

### 1:00 — The crossing. Do not cut this *(48 words, ~19s)*

**Tap a bead** that changed subject.

> "It has crossed from big numbers into fractions. That looked like a bug
> until I measured it — grade-five decimals have sixteen fraction skills
> underneath them, because a decimal *is* a fraction. It crosses a hundred
> percent of the time. The graph was right and the product used to say
> nothing."

---

### 1:19 — Bedrock *(41 words, ~16s)*

> "It was never about fractions. She got stuck at grade five; the thing
> actually broken is five grades below, in kindergarten. It names it in words
> a child can read, and tells her how sure it is. Seven times in ten, it is
> exactly right."

---

### 1:35 — Repair, and where the AI sits *(52 words, ~21s)*

Press **Fix it**, drag the instrument.

> "This is the only place it asks her to drag something — manipulatives help
> memory more than transfer, so they belong where she stays with one skill.
> The questions themselves are written by a language model and then executed
> by a symbolic engine. If the maths does not check out, the question is
> thrown away. A weak model costs me questions, never correctness."

---

### 1:56 — The Cascade *(35 words, ~14s)*

> "And this is the reward. One kindergarten idea fixed, and everything that
> was standing on it wakes up — real skills, from the real graph. No points,
> no streak, no timer. The reward is evidence."

---

### 2:10 — The Grove *(24 words, ~10s)*

> "Back at the grove, one repair has fed four different topics — because a
> fraction genuinely does rest on shapes."

---

### 2:20 — The grown-up view *(30 words, ~12s)*

**For grown-ups.**

> "And for a parent or a tutor: what she was asked, and *why* the wrong answer
> was wrong — the named misconception, not a tick. Plus where she stands
> across the whole subject."

---

### 2:32 — The numbers, silent on screen *(no narration)*

```
73.2% exact   ·   84.1% within one hop   ·   10.9 questions
across all 16 topic/grade combinations
worksheet baseline: 0%
zero model calls at runtime — it works offline
```

---

### If you have 20 seconds spare

> "It makes no model calls while a child is using it. Everything is generated
> and verified at build time, so there is no key in the browser, nothing to
> rate-limit, and no outage that can take down a lesson."

---

## The shot list — clicks only

No words here; they are above. This is what to have on a second screen while
you record.

| at | do this |
|---|---|
| 0:00 | Grove on screen. **Do not click.** |
| 0:15 | **Start digging** → **Grade 5** → **Fractions** |
| 0:29 | Answer `1/2 + 2/3 = ?` with **1** |
| 0:38 | Answer **wrong** each time. Let the root draw down the strata. |
| 1:00 | **Tap a bead** on the rail that changed subject |
| 1:19 | The bedrock screen appears on its own |
| 1:35 | **Fix it** → drag the instrument |
| 1:56 | The Cascade runs itself → **Climb back up** |
| 2:10 | Finish the climb → back at the Grove |
| 2:20 | **For grown-ups** |
| 2:32 | Cut to the numbers card |

**Two things to point at with the cursor**, because they are easy to miss:
the **progress bar** at 0:38 (beat 2 of 5, "Digging"), and **"no score · no
timer"** underneath it.

---

## Exact routes to each instrument

Answering everything wrong drives the descent to the **floor**, and the floor
is counting and naming shapes — which is why arrays were unreachable. To land
on a middle-grade skill you have to answer some questions **right**, so the
posterior can rule the floor out.

### Arrays — 5 questions

**Grade 2 → Times tables**, first question wrong, then:

| Q | answer | (it is asking about) |
|---|---|---|
| 2 | **RIGHT** | Ten more, ten less |
| 3 | **RIGHT** | Adding and subtracting up to 20 |
| 4 | **WRONG** | Taking away tens |
| 5 | **RIGHT** | Ten more, ten less |
| 6 | **RIGHT** | Adding numbers up to 100 |

→ names **"Taking away tens"** (grade 1, 74% sure) → **Fix it** → array grid.

### Number line — 5 questions

**Grade 2 → Times tables**, first wrong, then **WRONG, WRONG, RIGHT, WRONG,
RIGHT** → names *"Breaking numbers apart"* (grade K, 73%) → **Fix it**.

### Balance — 4 questions, all wrong

**Grade 2 → Times tables**, answer **everything wrong** → names *"Showing
adding and taking away"* (grade K, 84%) → **Fix it**.

*The easiest one to demo, and the one whose lesson is sharpest: the beam only
levels when both sides are the same, which is what "=" means.*

### Slicer — 11 questions

**Grade 5 → Big numbers**, wrong, then WRONG, WRONG, RIGHT, RIGHT, RIGHT,
WRONG, RIGHT, RIGHT, RIGHT, WRONG → *"Cutting a whole into equal parts"*.

Long. For a 3-minute video use `?preview=cut` instead.

---

## The shortcut, if a route drifts

Every instrument has a direct URL that needs no session:

```
https://sham-puttane.github.io/Taproot-Nerdy-AI-Hackathon/?preview=groups
```

`groups` · `numberline` · `balance` · `cut` · `word` · `partition` · `compare`
· `place`

Use these if you are recording pickups, not for the main take — the point of
the product is that the engine *chose* the instrument.

---

## Spare lines, if a beat runs short

Three points that are true, quotable, and not in the main script. Each is
about ten seconds. Say at most one -- the script is already 2:32.

- **Runs with no model calls.** "Everything is generated and verified before
  it ships, so there is no key in the browser, nothing to rate-limit, and no
  outage that can take a lesson down. It works on a plane."
- **On the questions.** "A language model writes them and a symbolic engine
  executes them. If the maths does not check out the question is thrown away,
  so a weak model costs me questions, never correctness."
- **On who uses it.** "One tablet, several children, each with their own
  grove. For a tutoring company that is not an edge case, it is Tuesday
  afternoon."

---

## If you are asked a hard question afterwards

- **"Is 73% good?"** "It is measured against three baselines sharing the
  same belief model and stopping rule -- asking in curriculum order gets 9.5%,
  random adaptive 2%, a worksheet 0%, because a worksheet cannot name a cause
  at all."
- **"Have real children used it?"** "No. Every number is against simulated
  learners with slip and guess noise. That is honest and it is not the same as
  evidence, and validating on real learners is the first thing I would do
  next."
- **"Where is the AI?"** "Three places. Embedding retrieval maps 253
  expert-authored misconceptions onto the standards. A language model writes
  the questions behind a symbolic gate. And the live loop is Bayesian
  inference over the graph -- deliberately not an LLM, because it has to be
  fast, deterministic, and explainable to a parent."
