"""A real generation run against real skills, so quality is seen not assumed.

Deliberately NOT a token probe. A five-token health check tells you the key
parses; it tells you nothing about whether the thing we actually need -- a
grade-appropriate textbook-style question with a misconception-driven
distractor -- comes back usable. So this asks for exactly what the pack needs,
on skills taken from the shipped pack, and prints what came back.

Run:  python agents/try_items.py [n]
"""
from __future__ import annotations

import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm import ask_json                                   # noqa: E402

PACK = os.environ.get("TAPROOT_PACK", "D:/taproot/app/public/pack.json")

SYSTEM = """You write mathematics questions for children, in the style of a \
real elementary school textbook.

Rules that matter more than style:
- The question must be solvable using ONLY the named skill and skills below it.
- The numbers must be ones a child at that grade actually meets.
- The wrong answers must each be what a child would get by making a SPECIFIC \
error, never a random number.
- Reading level matters as much as the maths. A kindergarten skill gets a \
kindergarten sentence. Never make a younger child read more than an older one.

Return ONLY JSON, no prose."""

TEMPLATE = """Skill: {kid}
Formal name: {teacher}
Standard: {code}   Grade: {grade}
Maximum words in the question stem: {maxwords}

Write ONE question in the style of a {gradeword} textbook.

Return JSON exactly like this:
{{
  "stem": "the question, at most {maxwords} words",
  "answer": "the correct answer as a plain string",
  "options": ["four options, one of which is exactly the answer"],
  "answer_index": 0,
  "distractor_reasons": [
    "why a child would pick option 0",
    "why a child would pick option 1",
    "why a child would pick option 2",
    "why a child would pick option 3"
  ],
  "context": "one or two words naming the real-world setting, or 'bare' if none"
}}"""

# The budget that fixes the difficulty inversion: a younger child reads LESS.
MAX_WORDS = {0: 8, 1: 8, 2: 12, 3: 12, 4: 18, 5: 18}
GRADE_WORD = {0: "kindergarten", 1: "grade 1", 2: "grade 2",
              3: "grade 3", 4: "grade 4", 5: "grade 5"}


def gnum(g: str) -> int:
    return 0 if g == "K" else int(g)


def main() -> int:
    pack = json.load(io.open(PACK, encoding="utf-8"))
    nodes = {n["code"]: n for n in pack["nodes"]}

    # One from each end of the range, plus the skill whose name most clearly
    # promises a word problem and currently serves "6 + 11 = ?".
    wanted = ["5.NF.A.1", "4.MD.A.2", "3.NF.A.1", "K.OA.A.1", "4.OA.A.3"]
    n = int(sys.argv[1]) if len(sys.argv) > 1 else len(wanted)
    wanted = wanted[:n]

    ok = 0
    for code in wanted:
        node = nodes.get(code)
        if not node:
            print(f"\n--- {code}: not in pack, skipped")
            continue
        g = gnum(node["grade"])
        prompt = TEMPLATE.format(
            kid=node.get("kid") or node["teacher"],
            teacher=node.get("teacher", ""),
            code=code, grade=node["grade"],
            maxwords=MAX_WORDS[g], gradeword=GRADE_WORD[g],
        )
        print(f"\n{'=' * 74}\n{code}  grade {node['grade']}  "
              f"{node.get('kid','')}\n  (budget {MAX_WORDS[g]} words)")
        try:
            out = ask_json(SYSTEM, prompt)
        except Exception as e:                              # noqa: BLE001
            print(f"  FAILED: {e}")
            continue

        stem = str(out.get("stem", ""))
        words = len(stem.split())
        opts = out.get("options") or []
        ai = out.get("answer_index")
        print(f"  stem   ({words} words): {stem}")
        print(f"  answer : {out.get('answer')}")
        print(f"  options: {opts}")
        print(f"  context: {out.get('context')}")
        for i, r in enumerate(out.get("distractor_reasons") or []):
            mark = "*" if i == ai else " "
            print(f"    {mark} [{i}] {r}")

        # the checks the real pipeline will enforce
        problems = []
        if words > MAX_WORDS[g]:
            problems.append(f"over budget by {words - MAX_WORDS[g]} words")
        if len(opts) != 4:
            problems.append(f"{len(opts)} options, expected 4")
        # `(ai or -1)` was the bug here: answer_index 0 is falsy in Python, so
        # every item whose correct answer sat first was rejected as "out of
        # range". The gate was wrong, not the model.
        if not isinstance(ai, int) or not (0 <= ai < len(opts)):
            problems.append("answer_index out of range")
        elif str(opts[ai]).strip() != str(out.get("answer")).strip():
            problems.append("answer_index does not point at the answer")
        if len({str(o).strip() for o in opts}) != len(opts):
            problems.append("duplicate options")
        print("  GATE   : " + ("PASS" if not problems
                               else "REJECT -> " + "; ".join(problems)))
        ok += not problems

    print(f"\n{'=' * 74}\n{ok}/{len(wanted)} would survive the structural gate "
          f"(SymPy verification is a further gate on top of this)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
