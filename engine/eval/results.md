# Does the descent actually work?

200 synthetic learners, each with one planted gap somewhere in the 52-node corridor beneath `5.NF.A.1`. 51 nodes could hold the gap, so blind guessing scores about 2%.

Responses are noisy: a learner who knows a skill still slips 10% of the time, and one who does not still guesses right 25% of the time. Those are the same slip and guess rates the engine believes in, so no policy can win by exploiting a clean oracle.

**Every adaptive policy shares the same belief model and the same stopping rule.** The only difference is which question comes next -- which is the one thing being measured. An earlier version of this harness let Taproot confirm its hypothesis while the baselines could not; that flattered it, and was fixed.


## Results

| | Questions asked | Exact gap found | Within 1 prerequisite | Reached a diagnosis |
|---|---|---|---|---|
| **Taproot** | 13.5 | 71.5% | 88.0% | 95.0% |
| Curriculum order | 22.8 | 9.5% | 9.5% | 12.0% |
| Random adaptive | 23.7 | 2.0% | 2.5% | 3.0% |
| Worksheet | 20.0 | 0.0% | 0.0% | 0.0% |

- **Taproot** -- information gain over the prerequisite graph
- **Curriculum order** -- most foundational first, as a textbook chapter would
- **Random adaptive** -- shuffled order, same machinery otherwise
- **Worksheet** -- twenty more of the same problem -- what homework does today

## What this says

**Choosing what to ask is where the accuracy is.** Selecting by mutual information finds the exact gap 71.5% of the time; walking the curriculum in order finds it 9.5% of the time on the same budget, with the same beliefs underneath.

The reason is unglamorous. A curriculum sweep starts at the most foundational skills, which are exactly the ones a struggling fifth grader already has, so it spends its questions confirming things that were never broken. Letting the baselines confirm each node several times before advancing barely moved them; the numbers above are their BEST setting, not their worst.

**Being close is worth something.** 88% of diagnoses land within one prerequisite hop of the truth. A repair that starts one step above the real gap still teaches the right idea -- it costs the learner a little time she did not strictly need to spend.

**It stays quiet when it does not know.** On 5% of learners the posterior never reaches the confidence bar and nothing is named. That is deliberate: the alternative is telling a parent to go and fix something on a coin flip.

**The comparison that matters is the last row.** A worksheet asks twenty more of the same problem and names a cause 0% of the time -- not because it is bad at diagnosis, but because nothing in it ever looks below the grade the child is stuck in. That is the gap this product exists to close.


### What changed, and how we found out

The first version of this engine diffused per-node mastery beliefs along the graph with a damping constant, and scored 39% exact -- statistically indistinguishable from asking in curriculum order. Diffusion turned out to be a heuristic standing in for something computable. Because knowledge is monotone along the DAG, a question at N is a noisy test of exactly one proposition -- *is the gap in N or among the prerequisites of N?* -- which makes the posterior over gap identity a plain categorical distribution, updatable in closed form.

Replacing diffusion with that exact posterior, and allowing a skill to be re-tested instead of asked once and abandoned, moved exact identification from 39% to 72% and within-one-hop from 57% to 88%, while using FEWER questions (13.5 against 14.3).

Neither problem was visible from reading the code. Both showed up the first time the engine was measured.


## Reproducing

```bash
cd engine
npx tsx eval/sweep.ts 200 > eval/results.json
python eval/report.py > eval/results.md
```

Item cap 24, and the stopping confidence 0.65, were both chosen by sweeping them rather than by intuition. At a cap of 12, more than half of all descents ran out of budget before naming anything. At a confidence of 0.5 the engine answers more often but is right less; at 0.8 it is right more often but goes quiet on one learner in ten.

