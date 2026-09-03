# Does the descent actually work?

200 synthetic learners, each with one planted gap somewhere in the 52-node corridor beneath `5.NF.A.1`. 51 nodes could hold the gap, so blind guessing scores about 2%.

Responses are noisy: a learner who knows a skill still slips 10% of the time, and one who does not still guesses right 25% of the time. Those are the same slip and guess rates the engine believes in, so no policy can win by exploiting a clean oracle.

**All adaptive policies share the same stopping and confirmation rules.** Only the choice of what to ask next differs. An earlier version of this harness let Taproot confirm its hypothesis while the baselines could not, which made it look three times better than it is.


## Results

| | Questions asked | Exact gap found | Within 1 prerequisite | Reached a diagnosis |
|---|---|---|---|---|
| **Taproot** | 14.3 | 39.0% | 57.0% | 98.5% |
| Curriculum order | 16.5 | 38.5% | 54.0% | 86.0% |
| Random adaptive | 16.1 | 36.5% | 54.0% | 88.0% |
| Worksheet | 21.0 | 0.0% | 0.0% | 0.0% |

- **Taproot** — information gain over the prerequisite graph
- **Curriculum order** — most foundational first, as a textbook chapter would
- **Random adaptive** — shuffled order, same machinery otherwise
- **Worksheet** — twenty more of the same problem -- what homework does today

## What this says, including the part that is inconvenient

**Information-gain selection does not buy much accuracy.** 39.0% against 38.5% for simply asking in curriculum order is not a meaningful gap at this sample size. Once confirmation is shared protocol, most of the diagnostic power comes from the confirmation rule, not from the search.

**Where it does win is reliability and cost.** Taproot reaches a diagnosis 98.5% of the time against 86.0%, and does it in 14.3 questions rather than 16.5. For a child that is two fewer questions and, far more importantly, an answer almost every time instead of one in seven sessions ending in a shrug.

**The comparison that matters is the last row.** A worksheet asks twenty more of the same problem and can never name a cause -- not because it is bad at it, but because nothing in it ever looks below the grade the child is stuck in. That is the gap this product exists to close.

**Honest ceiling.** 39% exact identification means the named skill is wrong most of the time, though 57% of diagnoses land within one prerequisite hop of the truth -- close enough that the repair is still useful. Improving this is the most valuable open problem in the engine.


## Reproducing

```bash
cd engine
npx tsx eval/sweep.ts 200 > eval/results.json
python eval/report.py > eval/results.md
```

Item cap 24, chosen by sweeping it rather than by intuition: at a cap of 12 more than half of all descents ran out of budget before naming anything. Accuracy plateaus at 24 and the median descent still uses about 12.

