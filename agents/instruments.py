"""Instrument items, generated deterministically from what a skill is about.

No model is involved and none is needed. A number-line item is a value, a
range and a tick count; an array item is a pair of factors. Both are decided
by the standard's own wording, so they can be produced offline, reproducibly,
and without spending a request on something arithmetic already knows.

Which instruments exist is not a taste decision. The IES What Works
Clearinghouse practice guides name three representations -- number lines,
arrays and strip diagrams -- and single out the number line as the central
tool for fractions from the early grades. We already had strip diagrams (the
`partition` bar). These are the other two.

Coverage measured against the shipped pack: number line matches 38 of 101
skills, arrays 31. Before this, 13 of 729 items were hands-on -- 1.8%.

Run:  python agents/instruments.py            (writes instrument_items.json)
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
from fractions import Fraction

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from verifier import GRADE_DENOMINATORS, verify        # noqa: E402

OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")
PACK = os.environ.get("TAPROOT_PACK", "D:/taproot/app/public/pack.json")

# What a skill has to be ABOUT for each instrument to be honest about it. A
# number line on a skill that is not about magnitude would be decoration, and
# decoration is the thing the research says to avoid.
LINE_RE = re.compile(
    r"number line|place value|round|greater|less than|compare|comparing|order"
    r"|tenth|hundredth|between|magnitude|nearest", re.I)
ARRAY_RE = re.compile(
    r"array|arrays|group|groups|row|column|multipl|divid|equal share"
    r"|equal group|times|product|area", re.I)

# A grade-appropriate line: how far it runs and how finely it is cut.
LINES = {
    "K": [(0, 10, 10), (0, 5, 5)],
    "1": [(0, 20, 10), (0, 10, 10), (0, 100, 10)],
    "2": [(0, 100, 10), (0, 50, 10), (0, 20, 20)],
    "3": [(0, 1, 4), (0, 1, 8), (0, 1, 3), (0, 100, 10), (0, 1000, 10)],
    "4": [(0, 1, 10), (0, 1, 12), (0, 1, 100 // 20), (0, 1000, 10)],
    "5": [(0, 1, 10), (0, 1, 12), (0, 1, 8), (0, 10, 10)],
}


def gnum(g: str) -> int:
    return 0 if g == "K" else int(g)


def line_items(node: dict, want: int) -> list[dict]:
    """Values that actually land on a tick, which is the only real constraint."""
    grade = node["grade"]
    allowed = GRADE_DENOMINATORS.get(grade)
    out: list[dict] = []
    for lo, hi, ticks in LINES.get(grade, LINES["3"]):
        if hi == 1 and allowed is not None and ticks not in allowed:
            continue                    # eighths at grade 2 etc.
        step = Fraction(hi - lo, ticks)
        # skip the ends: 0 and the maximum are labelled, so placing them is
        # reading a label rather than judging a magnitude
        for k in range(1, ticks):
            val = Fraction(lo) + step * k
            text = (f"{val.numerator}/{val.denominator}"
                    if val.denominator != 1 else str(val.numerator))
            out.append({
                "kind": "numberline",
                "stem": f"Put {text} on the line.",
                "value": text,
                "min": lo, "max": hi, "ticks": ticks,
                "grade": grade,
                "node": node["code"], "node_id": node["id"],
                "options": [], "answer_index": 0,
            })
            if len(out) >= want:
                return out
    return out


def array_items(node: dict, want: int) -> list[dict]:
    """Factor pairs a child at this grade actually meets."""
    grade = node["grade"]
    hi = {"K": 5, "1": 5, "2": 6, "3": 10, "4": 12, "5": 12}.get(grade, 10)
    out: list[dict] = []
    for rows in range(2, hi + 1):
        for cols in range(2, hi + 1):
            if rows * cols > 144:
                continue
            out.append({
                "kind": "groups",
                "stem": f"Build {rows} rows of {cols}.",
                "rows": rows, "cols": cols, "total": rows * cols,
                "grade": grade,
                "node": node["code"], "node_id": node["id"],
                "options": [], "answer_index": 0,
            })
            if len(out) >= want:
                return out
    return out


def main() -> int:
    pack = json.load(io.open(PACK, encoding="utf-8"))
    per = int(sys.argv[1]) if len(sys.argv) > 1 else 4

    made: list[dict] = []
    stats = {"numberline": 0, "groups": 0, "rejected": 0}
    reasons: dict[str, int] = {}
    touched: set[str] = set()

    for node in pack["nodes"]:
        text = " ".join(filter(None, [node.get("kid"), node.get("teacher"),
                                      node.get("text")]))
        wanted: list[dict] = []
        if LINE_RE.search(text):
            wanted += line_items(node, per)
        if ARRAY_RE.search(text):
            wanted += array_items(node, per)

        for item in wanted:
            v = verify(item)
            if v.ok:
                made.append(item)
                stats[item["kind"]] += 1
                touched.add(node["code"])
            else:
                stats["rejected"] += 1
                head = v.reasons[0].split(";")[0][:48]
                reasons[head] = reasons.get(head, 0) + 1

    path = os.path.join(OUT, "instrument_items.json")
    os.makedirs(OUT, exist_ok=True)
    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(made, f, ensure_ascii=False, indent=1)

    print(f"number line  {stats['numberline']:>4} items")
    print(f"arrays       {stats['groups']:>4} items")
    print(f"rejected     {stats['rejected']:>4}")
    print(f"skills now hands-on: {len(touched)} of {len(pack['nodes'])}")
    if reasons:
        print("\nwhy rejected:")
        for r, c in sorted(reasons.items(), key=lambda kv: -kv[1])[:6]:
            print(f"   {c:>4}  {r}")
    print(f"\nwrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
