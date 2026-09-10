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

## The main take — 2:30

### 0:00 · The problem *(15s)*

Start digging → **Grade 5** → **Fractions**.

You get `1/2 + 2/3 = ?`. **Answer 1** (the option showing `1`).

> "A fifth grader gets this wrong. Every maths app I know responds by drilling
> fractions."

### 0:15 · The descent *(35s)*

Answer **WRONG** each time. Let the rail draw: the root grows down through the
grade strata, and the line underneath names why each move happened.

> "It isn't drilling. It's descending a real prerequisite graph, choosing each
> question to maximise information about *where* the break is."

Point at the **progress bar** — beat 2 of 5, "Digging" — and the *"no score,
no timer"* line.

### 0:50 · The crossing — **do not cut this** *(20s)*

**Tap any bead** on the rail that changed subject. The panel says:

> *"Decimals ARE fractions — 0.7 is seven tenths. So this goes through
> fractions."*

> "It crossed from big numbers into fractions. That looked like a bug until I
> measured it: grade-5 decimals have sixteen fraction skills underneath, and
> it crosses **100% of the time**. The graph was right and the product used to
> say nothing."

*This is the moment a judge realises there is a real graph underneath.*

### 1:10 · Bedrock *(20s)*

> **"It was never about fractions."**
> *You got stuck grade 5. The thing that is actually broken is 5 grades
> further down.*

The drop is drawn through the same strata. Read the three facts underneath:
questions asked, % sure, grade.

> "It names the skill in words a child can read, and tells her how sure it is.
> Seven times in ten it is exactly right."

### 1:30 · Repair on a manipulative *(20s)*

Press **Fix it**. Drag the instrument that appears.

> "Repair is the only place it asks her to drag something. Manipulatives show
> large effects on retention and small ones on transfer — so they belong where
> she stays with one skill, and nowhere else."

### 1:50 · The Cascade *(20s)*

> "One kindergarten idea fixed, and everything that was standing on it wakes
> up — real skills, from the real graph. That's the reward. No points, no
> streak, no timer."

### 2:10 · The Grove *(10s)*

Back to the grove. Several trees are lit from one repair.

> "One repair fed four topics, because a fraction genuinely rests on shapes."

### 2:20 · The grown-up view *(10s)*

**For grown-ups.**

> "What she was asked, and *why* the wrong answer was wrong — the named
> misconception, not a tick. Plus where she is across the whole subject."

### 2:30 · The numbers — on screen, not spoken

```
73.2% exact · 84.1% within one hop · 10.9 questions
measured across all 16 topic/grade combinations
worksheet baseline: 0%
```

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

## Worth saying if there is room

- **Zero model calls at runtime.** All generation is build-time, so there is
  no key in the browser and no provider outage that can take down a lesson. It
  works offline.
- **A weak model costs us questions, never correctness** — SymPy executes the
  working and rejects anything whose arithmetic does not check out.
- **One device, several children.** The learner roster is not an edge case for
  a tutoring company; it is Tuesday afternoon.
