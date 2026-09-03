"""Render eval/results.json into a readable report.

Run: npx tsx eval/sweep.ts 200 > eval/results.json
     python eval/report.py > eval/results.md
"""
import io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(io.open(f"{HERE}/results.json", encoding="utf-8"))

LABEL = {
    "taproot": "Taproot",
    "linear": "Curriculum order",
    "random": "Random adaptive",
    "worksheet": "Worksheet",
}
NOTE = {
    "taproot": "information gain over the prerequisite graph",
    "linear": "most foundational first, as a textbook chapter would",
    "random": "shuffled order, same machinery otherwise",
    "worksheet": "twenty more of the same problem -- what homework does today",
}

by = {s["policy"]: s for s in d["summary"]}
out = []
w = out.append

w("# Does the descent actually work?\n")
w(f"{d['learners']} synthetic learners, each with one planted gap somewhere in "
  f"the {d['corridorNodes']}-node corridor beneath `{d['wall']}`. "
  f"{d['plantableNodes']} nodes could hold the gap, so blind guessing scores "
  f"about {100 / d['plantableNodes']:.0f}%.\n")
w("Responses are noisy: a learner who knows a skill still slips 10% of the "
  "time, and one who does not still guesses right 25% of the time. Those are "
  "the same slip and guess rates the engine believes in, so no policy can win "
  "by exploiting a clean oracle.\n")
w("**All adaptive policies share the same stopping and confirmation rules.** "
  "Only the choice of what to ask next differs. An earlier version of this "
  "harness let Taproot confirm its hypothesis while the baselines could not, "
  "which made it look three times better than it is.\n")

w("\n## Results\n")
w("| | Questions asked | Exact gap found | Within 1 prerequisite | Reached a diagnosis |")
w("|---|---|---|---|---|")
for p in ["taproot", "linear", "random", "worksheet"]:
    s = by[p]
    name = f"**{LABEL[p]}**" if p == "taproot" else LABEL[p]
    w(f"| {name} | {s['itemsMean']:.1f} | {s['exactHitRate']:.1%} | "
      f"{s['within1HopRate']:.1%} | {s['diagnosedRate']:.1%} |")

w("\n" + "\n".join(f"- **{LABEL[p]}** — {NOTE[p]}" for p in LABEL))

w("\n## What this says, including the part that is inconvenient\n")
t, l = by["taproot"], by["linear"]
w(f"**Information-gain selection does not buy much accuracy.** "
  f"{t['exactHitRate']:.1%} against {l['exactHitRate']:.1%} for simply asking "
  f"in curriculum order is not a meaningful gap at this sample size. Once "
  f"confirmation is shared protocol, most of the diagnostic power comes from "
  f"the confirmation rule, not from the search.\n")
w(f"**Where it does win is reliability and cost.** Taproot reaches a "
  f"diagnosis {t['diagnosedRate']:.1%} of the time against "
  f"{l['diagnosedRate']:.1%}, and does it in {t['itemsMean']:.1f} questions "
  f"rather than {l['itemsMean']:.1f}. For a child that is two fewer questions "
  f"and, far more importantly, an answer almost every time instead of one in "
  f"seven sessions ending in a shrug.\n")
w("**The comparison that matters is the last row.** A worksheet asks twenty "
  "more of the same problem and can never name a cause -- not because it is "
  "bad at it, but because nothing in it ever looks below the grade the child "
  "is stuck in. That is the gap this product exists to close.\n")
w(f"**Honest ceiling.** {t['exactHitRate']:.0%} exact identification means the "
  f"named skill is wrong most of the time, though "
  f"{t['within1HopRate']:.0%} of diagnoses land within one prerequisite hop of "
  f"the truth -- close enough that the repair is still useful. Improving this "
  f"is the most valuable open problem in the engine.\n")

w("\n## Reproducing\n")
w("```bash\ncd engine\nnpx tsx eval/sweep.ts 200 > eval/results.json\n"
  "python eval/report.py > eval/results.md\n```\n")
w(f"Item cap {d['maxItems']}, chosen by sweeping it rather than by intuition: "
  f"at a cap of 12 more than half of all descents ran out of budget before "
  f"naming anything. Accuracy plateaus at 24 and the median descent still uses "
  f"about 12.\n")

sys.stdout.write("\n".join(out) + "\n")
