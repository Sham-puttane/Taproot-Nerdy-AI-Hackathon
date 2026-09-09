# The plan, 9 days out

Written 9 Sept 2026. Deadline **Fri 18 Sept, 11:59pm CDT**.

Everything below is grounded in `engine/eval/trace.ts`, which prints the real
item sequence a child actually sees. Run it yourself:

```
cd engine && npx tsx eval/trace.ts 4.OA.A.3 3
```

---

## What the trace found

### One function causes most of the complaints

`agents/generator.py::gen_whole` emits `a <op> b = ?` for **any** OA or NBT
skill, ignoring what the skill is about. It produces **624 of 729 items
(86%)**. The whole pack has only **247 distinct stems**.

That single placeholder is why:

- **"only plus and multiplication questions"** — 86% of the pack literally is
  `a + b = ?` or `a × b = ?`
- **"how does every word problem end up in big numbers"** — it doesn't. Every
  skill, word problem or not, is served the *same generic arithmetic*, so
  Times tables and Big numbers are indistinguishable at the item level
- **11 of 11 skills whose name promises a word problem serve only bare
  arithmetic:**

  | skill | promises | actually serves |
  |---|---|---|
  | `4.MD.A.2` | Measuring word problems | `6 + 11 = ?` |
  | `2.OA.A.1` | Two-step word problems | `5 + 6 = ?` |
  | `3.OA.A.3` | Times and sharing word problems | `6 × 12 = ?` |
  | `4.NF.B.4.c` | Fraction times a whole number, in a story | `1/4 + 2/4 = ?` |

- **thin misconceptions** — one generic label ("Counts the starting number
  when counting on") on 528 items, because generic items can only carry a
  generic error. **253 misconceptions were ingested; 3 are executable.**

### Difficulty runs backwards

Trace of `5.NF.A.1`, words per stem as it descends:

```
grade:  5    4    3    2    K    K
words:  5    7    7   16   19   16
stem:  "1/2 + 2/3 = ?"  ...  "This cake was cut into 3 pieces that are NOT
                              the same size. Is the shaded piece one third?"
```

The grade goes **down** and the reading load goes **up ~4x**. A kindergarten
skill is tested with a 19-word sentence. Stem lengths across the pack are
bimodal — 632 items at 5 words, then a jump straight to 15–20, nothing
between — so there is no gentle curve, just two registers.

This is the single most damaging bug in the product: the child is already
failing, we send her deeper, and we make her read *more*.

### Grade order is not monotone

Trace of `4.OA.A.3` grades in order: `4 → 2 → 4 → 1 → 0 → 0 → 0`. Information
gain is doing its job, but to a child it looks like the app is jumping around.

### Hosting

Live is **GitHub Pages**, not Vercel. `vercel.json` exists but there is no
`.vercel` directory — the project was never linked, because importing a repo
needs an OAuth grant only the account owner can click.

---

## Dependency map — what blocks what

```
                    ┌─────────────────────────┐
                    │ 1. GENERATOR REWRITE    │  <- the spine
                    │    (OpenRouter + SymPy) │
                    └───┬───────┬─────────┬───┘
                        │       │         │
          ┌─────────────┘       │         └──────────────┐
          v                     v                        v
  2. WORD PROBLEMS      3. MISCONCEPTIONS       4. READING-LOAD BUDGET
     real contexts         3 -> ~40 executable     short stems at low grades
          │                     │                        │
          │                     v                        │
          │            5. PARENT REPORT                  │
          │               "wrong BECAUSE..."             │
          v                     v                        v
                    ┌─────────────────────────┐
                    │      6. THE VIDEO       │
                    └─────────────────────────┘

  Independent of the spine (can run in parallel):
    A. INSTRUMENTS  (Fold, Groups, Balance, Number line)   <- "interactive"
    B. UI PASS      (bedrock screen, Dig gesture, tap-a-bead)
    C. WRITTEN DESCRIPTION  (required submission field)
```

**Critical path: 1 → 3 → 5 → 6.** Everything else can be cut.

---

## Three plans

### Plan A — Content first (highest ceiling, highest risk)

Rewrite the generator with an OpenRouter model proposing items and SymPy
verifying them. Fix word problems, misconceptions and reading load together.

- **Days 1–4** generator rewrite + verifier extension
- **Days 5–6** parent report on the richer data
- **Days 7–8** UI pass
- **Day 9** video

*Wins:* fixes 5 complaints at the root; makes agentic AI the strongest
evidenced claim; the pack stops being 86% `a + b = ?`.
*Risk:* if generation quality is poor on a free tier, days 1–4 are spent and
the product is unchanged. Mitigated because SymPy is the gate — bad output is
*rejected*, never shipped, so the failure mode is "fewer items", not "wrong
maths".

### Plan B — Product polish first (lowest risk, lowest ceiling)

Leave content alone. Build instruments, fix the UI, improve the report's
presentation.

- **Days 1–3** four instruments
- **Days 4–5** UI pass + bedrock screen
- **Days 6–7** parent report presentation
- **Day 8** buffer, **Day 9** video

*Wins:* guaranteed visible improvement; "interactive" complaint solved.
*Risk:* the demo still shows `7 + 3 = ?` under a skill called "Word problems
with several steps". A judge who plays it finds the same hollow centre.

### Plan C — Spine + two instruments (RECOMMENDED)

Fix the generator, but time-box it hard and take only the two instruments
that carry the most weight.

| Day | Work | Ships |
|---|---|---|
| 1 | **Reading-load budget** — cap stem length by grade; rewrite the verbose partition/cut stems short. No model needed. | difficulty curve fixed |
| 1–3 | **Generator rewrite**: OpenRouter proposes word-problem stems + wrong algorithms per misconception; SymPy verifies and rejects; `langgraph` runs propose→verify→retry. Time-boxed: whatever is verified by end of day 3 ships, the rest keeps today's items. | real word problems, ~40 misconceptions |
| 4 | **Parent report v2** — per question: what was asked, what she answered, and *why that answer* (named misconception), not just ✓/✗ | the report complaint |
| 5–6 | **Two instruments**: Number line (place/compare, reaches ~30 nodes) and Groups (multiplication as arrays, reaches ~34) | "interactive" |
| 7 | **UI pass**: bedrock screen payoff, Dig gesture, tap-a-bead-for-why | UI complaint |
| 8 | **Written description** (required field) + README refresh + buffer | submission |
| 9 | **Video** | submission |

Every day ships something. If day 3 fails, days 4–9 still stand.

---

## The todo list

Ordered. `[blocked by N]` marks dependencies.

**Spine**
1. Reading-load budget: max words per stem by grade (K–1: 8, 2–3: 12, 4–5: 18);
   rewrite the 40 verbose partition/cut stems to fit
2. OpenRouter client behind one interface; key from env, never in the repo
3. Word-problem generator: context templates per skill family, numbers chosen
   by the existing grade caps, answer computed not generated `[2]`
4. Misconception→algorithm expansion: model proposes executable wrong
   algorithms for the 253 ingested misconceptions; SymPy executes both and
   rejects any that don't produce a distinct, plausible wrong answer `[2]`
5. Extend `verifier.py` to gate word problems (units, plausibility, answer
   uniqueness) `[3]`
6. Rebake the pack; re-run `sections.ts`; confirm accuracy did not regress `[3,4]`

**Product**
7. Parent report v2: per-question "she answered X because <misconception>" `[4]`
8. Number line instrument
9. Groups/array instrument
10. Bedrock screen — make the payoff land
11. Dig gesture
12. Tap-a-bead → why we came here

**Submission**
13. Written description of what was built + construction approach `[6]`
14. README refresh `[6]`
15. Demo video `[all]`

**Housekeeping**
16. Remove unused deps (`chromadb`, `fastapi`, `uvicorn`, `duckdb`,
    `pydantic`, `python-dotenv`) and the empty `api/` — or make them real.
    `anthropic`/`langgraph` become real under item 4.
17. Decide Vercel: either link it (needs an OAuth click) or delete
    `vercel.json` so the repo stops implying a host it does not use.

---

## On the OpenRouter key

**Do not paste it into chat.** Set it in the shell that runs the build:

```
setx OPENROUTER_API_KEY "sk-or-..."
```

Then open a new terminal. The generator reads `os.environ` and fails loudly
if the key is absent — it never falls back to shipping unverified items.

The key is used **at build time only**. The shipped game still makes zero
model calls, so the live demo cannot break, cannot leak a key, and still works
offline. That property is worth more than anything a runtime model call buys.
