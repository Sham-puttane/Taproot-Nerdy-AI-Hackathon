# Demo script: the pitch

One continuous take, about 2:50. Every question, explanation and screen below
was walked on the live site on 14 Sept and is a transcript of what appeared,
not a description of what the code should do.

It shows four things in one flow:

| | shown at |
|---|---|
| **The game loop** mapped to the prompt's own words: steady progression, reward mastery | 0:15, 2:05, 2:15 |
| **Speaking and hearing**: reads questions aloud, answers by voice | 0:35 |
| **The AI and the engineering**: graph, Bayesian search, LLM behind a symbolic gate | 1:00, 2:25 |
| **Multi-user**: separate groves on one device | 2:40 |

---

## Before you press record

Do all of this off camera. Each step exists because skipping it breaks a beat.

1. **Use Chrome.** Voice answers use Chrome's speech recogniser, which sends
   audio to Google and needs a network. Read-aloud works in Edge too, but the
   microphone beat is safest in Chrome.
2. **Clear site data** for the page (F12, Application, Clear site data).
3. Type **Leo**, press **Start a grove**.
4. Tap the **Leo** chip top right, **Someone else**, type **Maya**, **Start a
   grove**. You are now on Maya's empty Grove, with Leo waiting in the roster.
   *This is what lets you show a second learner at the end without typing on
   camera.*
5. **Grant the microphone once.** Start digging, tap 🎤 Say it instead, allow
   the permission, then reload. Otherwise the browser's permission prompt
   appears in the middle of your take.
6. Check the **build stamp** bottom left is from today.
7. **Record system audio as well as your voice.** The read-aloud beat is
   silent otherwise.
8. **Rehearse the 🎤 beat once.** I could not test speech input from here, only
   the matching. If it mishears, tapping the button is the fallback and looks
   identical.

---

## The take

Spoken words are counted so the timing is checked, not hoped for. **351 words
at 150 a minute is 2:20 of speech**, plus about 30 seconds of the app speaking,
the Cascade animating and clicks. Lands around 2:50.

### 0:00 · Cold open, over Maya's empty Grove *(41 words)*

**Do not click.** Six seeds on screen.

> "This is Taproot. When a fifth grader gets fractions wrong, most maths apps
> give her more fractions. But she is rarely failing fractions. She is missing
> something years earlier that they are built on. Taproot is a game about
> finding it."

### 0:15 · The game, in the prompt's own words *(36 words)*

Click **Start digging → Grade 2 → Times tables & word problems**.

> "The prompt asks for mechanics that reward mastery and steady progression.
> Here, progression is depth: you dig under the problem you got wrong until you
> hit the real gap. The reward is what fixing it unlocks."

### 0:35 · It speaks, and it listens *(23 + 11 words)*

The first question appears: **"Sam has 45 marbles, gives 12, then finds 20
more."** **Stay silent** and let the app read it aloud. About four seconds.

> "It reads each question aloud, because a child behind in maths is often
> behind in reading too. And she can answer out loud."

Tap **🎤 Say it instead** and say **"thirty three"**. It picks 33 and says
*"Not that one."*

Tap **🔊** top right to mute it.

> "Browser speech, no API key, and a teacher can mute it."

*Muting here also stops the app talking over the rest of your narration.*

### 1:00 · How it works, while it digs *(46 words)*

On **"What is ten more than 34?"** tap **45**.
On **"What is ten plus five?"** tap **16**.

> "Underneath is a real prerequisite graph: the Coherence Map, two hundred and
> ninety thousand nodes reduced to a hundred and fifty-nine K to 5 skills. Each
> question is the one that tells it most about where the gap is, and every
> answer updates a Bayesian estimate."

### 1:20 · It explains itself *(29 words)*

On the rail at left, **tap the bead labelled "Ten more, ten less"** in the
Grade 1 band. The panel reads *"Adding tens is really about place value, so we
check that first."*

> "And it explains itself. Tap the root and it says why it left times tables:
> adding tens is really about place value. It crosses subjects because the
> maths does."

Then on **"Sam has 7 apples. He gets 4 more."** tap **3**, and on **"Mia had 5
stickers, gave 2 away."** tap **7**.

### 1:35 · Bedrock *(37 words)*

**"It was never about times tables."** appears with the drop drawn, and
*5 questions · 84% sure · kindergarten*.

> "Five questions, and it was never about times tables. The gap is a
> kindergarten idea two grades down, and it says how sure it is. In simulation
> it names the exact skill seventy-three percent of the time."

### 1:52 · Repair, hands-on *(24 words)*

Tap **Fix it**. The Balance: *"Make both sides weigh the same."*

- **"3 and 1 on one side. 2 and what?"** tap **+** twice, **That's balanced**
- **"3 and 1 on one side. 3 and what?"** tap **+** once, **That's balanced**

> "Fixing it is hands-on. The beam only levels when both sides are equal, which
> is what the equals sign really means. Two balances, repaired."

### 2:05 · The reward *(18 words)*

The Cascade runs on its own and ends on **"14 of 14 just woke up."**

> "And this is the reward. Not points: fourteen skills that were standing on
> that one idea, lighting up."

**Cut here.** Tap Climb back up and click through the climb off camera, or trim
it in the edit. It is about 25 seconds of answering that adds nothing.

### 2:15 · Progression *(17 words)*

Resume on the Grove: **"4 trees. 4 roots lit."**

> "Back in the grove, one repair fed four trees, because four topics rest on
> the same idea."

### 2:25 · The grown-up view, and the AI *(42 words)*

Tap **For grown-ups**. It shows **"LAST SESSION · SEP 14"**, *"She isn't behind
on times tables"*, and under **what she was asked**, lines like
**"What is ten more than 34? WHY: Adds one to each digit instead of ten."**

> "For a parent or tutor, the report stays after the session: what she was
> asked, and why each wrong answer was wrong. A language model wrote those, and
> a symbolic engine checked every answer, so a weak model costs questions,
> never correctness."

### 2:40 · One tablet, several children *(19 words)*

Tap **back**, tap the **Maya** chip, tap **Leo**. His grove reads **"Nothing
planted yet."**

> "One tablet, a whole family or a tutor's afternoon: Leo's grove is his own,
> and nothing leaves the device."

### 2:48 · Close *(8 words)*

Cut to the numbers card and hold it for five seconds.

> "No model calls at runtime. It works offline."

```
73.2% exact  ·  84.1% within one hop  ·  10.9 questions
16 topic and grade combinations, simulated learners
worksheet baseline 0%
zero model calls at runtime
```

---

## Why each spoken claim is true

So you can say it with confidence, and defend it if asked.

| Claim | Where it comes from |
|---|---|
| 290,000 nodes to 159 K–5 skills | CZI Learning Commons graph, 290,718 nodes; `data/processed/graph_k5.json` holds 159 |
| "the one that tells it most" | items chosen by mutual information over the gap posterior, `engine/src/diagnosis.ts` |
| "a Bayesian estimate" | exact categorical posterior over which skill is the gap |
| 73% exact | `engine/eval/sections.ts`, mean across all 16 walls, **simulated** learners, which is why the script says "in simulation" |
| "a language model wrote those" | all five questions on this route are `kind: word, authored: true`, each with its own reason per wrong option |
| "a symbolic engine checked every answer" | `agents/verifier.py` executes each authored item's working with SymPy and rejects any whose arithmetic disagrees |
| fourteen skills | the Cascade on this route, verified live |
| four trees | Grove after this session, verified live |
| nothing leaves the device | progress and names are in the browser's IndexedDB; the only network request is fetching the question pack |
| no model calls at runtime | generation happens at build time; the shipped app contains no model client |

One claim to **avoid** adding: that the fourteen skills are now mastered. The
Cascade shows what was *unblocked*. The Grove only lights skills she has
actually shown she holds, which is why it says four roots rather than
fourteen. The script is worded to match that.

---

## If something goes wrong mid-take

| Symptom | What to do |
|---|---|
| 🎤 mishears | Tap **33**. It looks the same on screen. |
| A different question than listed | The browser is not clean or the pack changed. Stop, clear site data, redo setup. |
| Old screens, no build stamp | A stale cache. Clear site data. |
| Grown-up view says "No session open right now" | That build predates the saved-session fix. Check the build stamp. |

Direct instrument pages for pickup shots, no session needed:
`?preview=balance`, `?preview=groups`, `?preview=numberline`.

---

## If you are asked afterwards

**"Is 73% good?"** Against three baselines sharing the same belief model and
stopping rule: curriculum order 9.5%, random adaptive 2%, a worksheet 0%,
because a worksheet cannot name a cause at all.

**"Have real children used it?"** No. Every number is against simulated
learners with slip and guess noise. That is honest and it is not evidence, and
validating on real learners is the first thing I would do next.

**"Why not an LLM at runtime?"** The live loop has to be fast, deterministic,
explainable to a parent, and working on a plane. The language model is used
where it is safe: writing questions at build time, behind a gate that executes
the maths.

**"How does voice work without a key?"** It is the browser's own Web Speech
API. Read-aloud uses the voices installed on the device. Speech recognition in
Chrome does go to Google's servers, so the microphone needs a connection; the
game never depends on it, and every question stays answerable by tapping.
