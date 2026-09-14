# Demo script

Walked end to end on the live site, not written from the code. Every question,
number and screen below is what actually appeared.

Routes recomputed with `engine/eval/demo_script.ts` after the last rebake.
**Re-run it if you rebake again; the routes move when the content moves.**

---

## Before you press record

1. **Clear the browser for this site.** F12 → Application → Clear site data,
   or use a fresh InPrivate window. A clean browser opens on *"What should we
   call you?"*, which is where the recording should begin.
2. Type a name (**Maya** works) and press **Start a grove**. Now you are on
   the Grove with six seeds, which is where the cold open belongs.
   *Do this before recording, or the first ten seconds are you typing.*
3. Check the **build stamp** bottom left is today's.
4. Leave the voice on. It reads every question aloud.

---

## Which route to record

There are two, and they show different things. Neither shows everything.

| | **A. Grade 5 → Fractions** | **B. Grade 2 → Times tables** |
|---|---|---|
| The drop | **5 grades**, grade 5 to kindergarten | 2 grades |
| Bedrock line | "It was never about fractions." | "It was never about times tables." |
| Repair shows | multiple choice, **no manipulative** | **the Balance instrument** |
| Questions | 6 | 5 |

**Record B as the main take.** It is the only one that reaches a manipulative,
and it shows the authored word problems. Then record A separately and cut in
just the bedrock screen at 1:19, because "five grades further down" is the
stronger line and it is worth twelve seconds.

If you only have one take in you, record B and say the five-grades line about
the general case rather than pointing at the screen.

---

## Take B, verified click by click

Everything in quotes below is what appeared on screen.

**Start digging → Grade 2 → Times tables & word problems**

| Q | on screen | do |
|---|---|---|
| 1 | "Sam has 45 marbles, gives 12, then finds 20 more" | any **wrong** option |
| 2 | "What is ten more than 34?" | **wrong** |
| 3 | "What is ten plus five?" | **wrong** |
| 4 | "Sam has 7 apples. He gets 4 more." | **wrong** |
| 5 | "Mia had 5 stickers, gave 2 away." | **wrong** |

Then: **"It was never about times tables."** · 5 questions · 84% sure ·
kindergarten.

Press **Fix it**. The **Balance** appears: *"Make both sides weigh the same."*

Note the first four questions are real word problems. That is worth pointing
at, because it is the part that took the longest to build.

---

## Take A, for the bedrock insert

**Start digging → Grade 5 → Fractions**

First question is **"Add 1/2 and 1/3."** with options `5/6`, `2/5`, `1`, `1/5`.

**Click 2/5.** Not a random wrong answer: it is what a child gets by adding
the numerators and the denominators, and it is the named misconception the
parent report will quote back.

Then answer wrong five more times. You will pass through:

- "Which sign belongs between 1/2 and 1/3?"
- "One slice of a cake cut into 3 equal pieces?"
- "A rectangle is cut into 3 equal sections; each section fraction?"
- "This chocolate bar was cut into 3 pieces that are NOT the same size..."

Lands on **"It was never about fractions."** · *You got stuck grade 5. The
thing that is actually broken is 5 grades further down.* · 6 questions · 67%
sure · kindergarten.

---

## The words

Read aloud at about 150 words a minute. Word counts so you can check timing
rather than hope. **380 words, about 2:32.**

### 0:00 Cold open, over the Grove *(38 words)*

> "This is Taproot. A fifth grader gets a fractions question wrong.
>
> Every maths app I have used answers that by giving her more fractions. But
> she is usually not failing fractions. She is missing something from three
> grades earlier that fractions are built on."

*Do not click. Let the six trees sit there.*

### 0:15 What it does *(34 words)*

Click **Start digging → Grade 2 → Times tables**.

> "So instead of drilling the thing she got wrong, it treats it as a symptom
> and goes looking for the cause. It asks about five questions, each one
> chosen to narrow down where the break actually is."

### 0:29 The first question *(24 words)*

> "A word problem, and she gets it wrong. Nothing is scored and nothing is
> lost. It just says: okay, let's find out why."

*Point at "no score, no timer" under the progress bar.*

### 0:38 How it works, while it happens *(56 words)*

Answer wrong each time.

> "Underneath is a real prerequisite graph, Common Core from the Coherence
> Map, two hundred and ninety thousand nodes reduced to a hundred and
> fifty-nine K to 5 skills. Each question is picked for maximum information
> about which skill is broken. Watch the root going down through the grades,
> and the line underneath saying why each move happened."

### 1:00 The crossing, do not cut this *(48 words)*

**Tap a bead** on the rail that changed subject.

> "It has crossed from one subject into another. That looked like a bug until
> I measured it. Grade five decimals have sixteen fraction skills underneath,
> because a decimal is a fraction. It crosses a hundred percent of the time.
> The graph was right and the product used to say nothing."

### 1:19 Bedrock *(41 words)*

*Cut to take A here if you recorded it.*

> "It was never about times tables. It names the broken idea in words a child
> can read, says which grade it lives in, and tells her how sure it is. Seven
> times in ten it is exactly right."

### 1:35 Repair *(52 words)*

Press **Fix it**. Drag blocks onto the balance.

> "This is the only place it asks her to drag something. Manipulatives help
> memory more than transfer, so they belong where she stays with one skill.
> The beam only levels when both sides are the same, which is what the equals
> sign actually means and what most children never get told."

### 1:56 The Cascade *(35 words)*

> "And this is the reward. One kindergarten idea fixed, and everything
> standing on it wakes up. Real skills from the real graph. No points, no
> streak, no timer. The reward is evidence."

### 2:10 The Grove *(24 words)*

> "Back at the grove, one repair has fed several topics, because these
> subjects genuinely rest on each other."

### 2:20 The grown-up view *(30 words)*

**For grown-ups.**

> "For a parent or tutor: what she was asked, and why the wrong answer was
> wrong, the named misconception rather than a tick. Plus where she stands
> across the whole subject."

### 2:32 Numbers, silent on screen

```
73.2% exact   ·   84.1% within one hop   ·   10.9 questions
across all 16 topic/grade combinations
worksheet baseline: 0%
zero model calls at runtime, works offline
```

---

## Other instrument routes, recomputed

**Number line** · Grade 2 → Times tables · wrong, WRONG, WRONG, RIGHT, WRONG,
RIGHT → *"Breaking numbers apart"* → Fix it

**Arrays** · Grade 2 → Times tables · wrong, RIGHT, RIGHT, WRONG, RIGHT, RIGHT
→ *"Taking away tens"* → Fix it

**Slicer** · 11 questions, too long. Use `?preview=cut`.

Direct URLs if a route drifts, no session needed:

```
?preview=balance   ?preview=numberline   ?preview=groups   ?preview=cut
?preview=word      ?preview=partition    ?preview=compare
```

Use these for pickups only. The point of the product is that the engine chose
the instrument.

---

## Spare lines if a beat runs short

Say at most one; the script is already 2:32.

- "It makes no model calls while a child is using it. Everything is generated
  and verified before it ships, so there is no key in the browser, nothing to
  rate limit, and no outage that can take a lesson down."
- "A language model writes the questions and a symbolic engine executes them.
  If the maths does not check out the question is thrown away, so a weak model
  costs me questions, never correctness."
- "One tablet, several children, each with their own grove. For a tutoring
  company that is not an edge case, it is Tuesday afternoon."

---

## If you are asked afterwards

**"Is 73% good?"** Against three baselines sharing the same belief model and
stopping rule: curriculum order 9.5%, random adaptive 2%, a worksheet 0%,
because a worksheet cannot name a cause at all.

**"Have real children used it?"** No. Every number is against simulated
learners with slip and guess noise. That is honest and it is not the same as
evidence, and validating on real learners is the first thing I would do next.

**"Where is the AI?"** Three places. Embedding retrieval maps 253
expert-authored misconceptions onto the standards. A language model writes the
questions behind a symbolic gate. The live loop is Bayesian inference over the
graph, deliberately not an LLM, because it has to be fast, deterministic and
explainable to a parent.
