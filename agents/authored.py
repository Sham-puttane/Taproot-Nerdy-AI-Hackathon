"""Textbook-style items, proposed by a model and gated by SymPy.

This is the agentic half of the pipeline. The loop is propose -> execute ->
verify -> reject -> retry, and the judge is a symbolic engine, not another
model. That distinction is the whole safety argument: a weak or hallucinating
model costs us YIELD, never correctness, because nothing reaches a child that
SymPy has not agreed with.

Why it exists: `gen_whole` in generator.py emits `a op b = ?` for ANY skill,
which is 624 of 729 shipped items. So a skill called "Measuring word problems"
served `6 + 11 = ?`, and a kindergarten skill was tested with a 19-word stem
while the grade-5 wall got a 5-word one. Both are traced in PLAN.md.

Three things make this affordable on a free tier:

  batching   one call yields N items for a skill, not one. ~8x fewer calls.
  caching    a skill already generated is never re-requested, so a rerun
             after a crash or a prompt tweak costs only what changed.
  threads    skills are independent, so they run concurrently.

Run:  python agents/authored.py --codes 5.NF.A.1,4.MD.A.2 --n 6
      python agents/authored.py --all --n 6 --workers 6
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm import ask_json                                   # noqa: E402
from verifier import GRADE_MAX_WHOLE, parse_value, verify  # noqa: E402

OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")
PACK = os.environ.get("TAPROOT_PACK", "D:/taproot/app/public/pack.json")
CACHE = os.path.join(OUT, "authored_cache.json")

# The budget that fixes the difficulty inversion. A younger child reads LESS:
# the trace found grade falling 5->K while words per stem rose 5->19.
MAX_WORDS = {"K": 8, "1": 8, "2": 12, "3": 12, "4": 18, "5": 18}
GRADE_WORD = {"K": "kindergarten", "1": "grade 1", "2": "grade 2",
              "3": "grade 3", "4": "grade 4", "5": "grade 5"}

SYSTEM = """You write mathematics questions for children, in the style of a \
real elementary school textbook.

Rules that matter more than style:
- Each question must be solvable using ONLY the named skill and skills below it.
- Use numbers a child at that grade actually meets.
- Every wrong option must be what a child would get by making a SPECIFIC
  error. Never a random number, never a joke answer.
- Reading level matters as much as the maths. A kindergarten skill gets a
  kindergarten sentence. Never make a younger child read more than an older one.
- Vary the situations across the set. Do not write the same question twice
  with different numbers.

Return ONLY JSON. No prose, no explanation, no code fences."""

TEMPLATE = """Skill: {kid}
Formal name: {teacher}
Standard: {code}   Grade: {grade}
{family}
HARD LIMIT: at most {maxwords} words in each stem.
Numbers must not exceed {cap}.

Write {n} DIFFERENT questions in the style of a {gradeword} textbook.

"expression" must be plain arithmetic that a calculator could evaluate: only
digits, + - * / ( ) and fractions. No words, no units, no variables. It is
checked, and the question is thrown away if it does not equal your answer.

Return a JSON object exactly like this:
{{
  "items": [
    {{
      "stem": "the question, at most {maxwords} words",
      "expression": "the computation, e.g. (72 - 18)/9 or 1/3 + 1/4",
      "answer": "what that expression equals, digits or a fraction like 3/4",
      "options": ["four options, one EXACTLY equal to answer"],
      "answer_index": 0,
      "reasons": ["why a child picks option 0", "...option 1",
                  "...option 2", "...option 3"]
    }}
  ]
}}"""

# What makes a question belong to its subject rather than being arithmetic
# with a different label on the tree. Without this, a measuring skill gets
# "10 + 3 = ?" and the six topics on the home screen are a lie.
FAMILY_HINT = {
    "MD": (
        "This is a MEASURING skill. The question must involve a real quantity "
        "with units -- length in cm/m/inches, mass in g/kg, liquid in ml/l, "
        "time in minutes/hours, or money. Never a bare sum. A child should "
        "have to think about the unit, not just the number."
    ),
    "NF": (
        "This is a FRACTIONS skill. The question must be about parts of a "
        "whole, equal shares, or a fraction of a quantity. Use fraction "
        "notation, not decimals."
    ),
    "OA": (
        "This is an OPERATIONS AND ALGEBRAIC THINKING skill. The question "
        "must be a situation -- groups of things, sharing out, comparing "
        "amounts, several steps. Never a bare sum with no story."
    ),
    "NBT": (
        "This is a PLACE VALUE skill. The question must turn on how the "
        "digits are worth different amounts -- tens and ones, regrouping, "
        "rounding, comparing sizes of numbers. Not just a calculation."
    ),
    "G": (
        "This is a GEOMETRY skill. The question must be about shapes, sides, "
        "corners, angles or equal pieces of a shape. Never arithmetic."
    ),
    "CC": (
        "This is a COUNTING skill for the youngest children. The question "
        "must be about counting objects, saying what comes next, or how many "
        "there are. Very short sentences."
    ),
}


def family_of(code: str) -> str:
    for k in ("NF", "OA", "NBT", "MD", "CC"):
        if "." + k in code:
            return k
    return "G" if ".G." in code else ""


_lock = threading.Lock()


def load_cache() -> dict:
    if os.path.exists(CACHE):
        try:
            return json.load(io.open(CACHE, encoding="utf-8"))
        except (ValueError, OSError):
            return {}
    return {}


def save_cache(cache: dict) -> None:
    os.makedirs(OUT, exist_ok=True)
    tmp = CACHE + ".tmp"
    with io.open(tmp, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=1)
    os.replace(tmp, CACHE)


def cache_key(code: str, n: int) -> str:
    """Prompt-shape aware, so tweaking the prompt invalidates the cache."""
    blob = f"{code}|{n}|{SYSTEM}|{TEMPLATE}|{FAMILY_HINT}"
    return hashlib.sha1(blob.encode("utf-8")).hexdigest()[:16]


# Number words a stem may legitimately use instead of digits. Ordinals matter
# as much as cardinals here: "Add one third and one fourth" is a perfectly
# answerable question, and reading it as missing a 3 and a 4 threw away four
# good fraction items on the first run.
_WORDS = {
    0: ("zero",), 1: ("one", "a ", "an ", "whole"),
    2: ("two", "half", "halves", "second"),
    3: ("three", "third"), 4: ("four", "fourth", "quarter"),
    5: ("five", "fifth"), 6: ("six", "sixth"), 7: ("seven", "seventh"),
    8: ("eight", "eighth"), 9: ("nine", "ninth"), 10: ("ten", "tenth"),
    11: ("eleven", "eleventh"), 12: ("twelve", "twelfth"),
    16: ("sixteen",), 20: ("twenty", "twentieth"), 30: ("thirty",),
    50: ("fifty",), 60: ("sixty",), 100: ("hundred",), 1000: ("thousand",),
}


def _numbers_missing_from(stem: str, expr: str) -> list[int]:
    """Operands in the working that the question never mentions."""
    low = stem.lower()
    digits = set(re.findall(r"\d+", low))
    missing = []
    for tok in re.findall(r"\d+", expr):
        if tok in digits:
            continue
        n = int(tok)
        # Fraction denominators are usually spelled out ("one third"), and
        # unit conversions legitimately use constants the stem never states
        # (minutes per hour, grams per kilo). Those are not the bug.
        if n in (60, 100, 1000, 12, 24, 7, 365):
            continue
        if any(w in low for w in _WORDS.get(n, ())):
            continue
        missing.append(n)
    return missing

def check(raw: dict, node: dict) -> tuple[dict | None, str]:
    """Structural gate, then SymPy. Returns (item, reason_if_rejected)."""
    grade = node["grade"]
    stem = str(raw.get("stem", "")).strip()
    if not stem:
        return None, "empty stem"

    words = len(stem.split())
    if words > MAX_WORDS[grade]:
        return None, f"stem {words} words, budget {MAX_WORDS[grade]}"

    opts = [str(o).strip() for o in (raw.get("options") or [])]
    if len(opts) != 4:
        return None, f"{len(opts)} options, want 4"
    if len(set(opts)) != 4:
        return None, "duplicate options"

    idx = raw.get("answer_index")
    # answer_index 0 is falsy in Python -- an `or` here silently rejects every
    # item whose correct answer sits first. It cost 0/5 once already.
    if not isinstance(idx, bool) and isinstance(idx, int) and 0 <= idx < 4:
        pass
    else:
        return None, f"answer_index {idx!r} out of range"

    answer = str(raw.get("answer", "")).strip()
    if opts[idx] != answer:
        return None, "answer_index does not point at the stated answer"

    # SymPy: every option must be a real number a child could write, the
    # answer must parse, and no two options may be the SAME number wearing
    # different clothes (3/6 and 1/2 would be an unanswerable question).
    values = [parse_value(o) for o in opts]
    if any(v is None for v in values):
        bad = [o for o, v in zip(opts, values) if v is None]
        return None, f"unparseable option(s): {bad}"
    if len({str(v) for v in values}) != 4:
        return None, "two options are the same number written differently"

    cap = GRADE_MAX_WHOLE.get(grade, 1000)
    for v in values:
        if abs(v) > cap:
            return None, f"value {v} above the grade cap {cap}"

    expr = str(raw.get("expression", "")).strip()
    if not expr:
        return None, "no expression -- the author did not show its working"

    # Every number the working uses must actually appear in the question.
    # SymPy happily verified "How many apples in total?" = 3+2, because the
    # arithmetic is right -- but the child sees no apples and no numbers. The
    # model had silently assumed a picture that does not exist. Checking the
    # maths is not the same as checking the question can be answered.
    missing = _numbers_missing_from(stem, expr)
    if missing:
        return None, (f"stem never mentions {missing} -- unanswerable "
                      f"without a picture we do not have")

    item = {
        # `word` rather than `arithmetic`: the verifier checks these by
        # evaluating the working the author showed, which is the only honest
        # way to gate a story problem.
        "kind": "word",
        "expression": expr,
        "stem": stem,
        "options": opts,
        "answer_index": idx,
        "grade": grade,
        "node": node["code"],
        "node_id": node["id"],
        "authored": True,
        "reasons": [str(r) for r in (raw.get("reasons") or [])][:4],
    }

    # Gate 1 proper: the same verifier every deterministic item passes through.
    v = verify(item)
    if not v.ok:
        return None, "verifier: " + "; ".join(v.reasons)
    return item, ""


def for_node(node: dict, n: int, cache: dict) -> tuple[list[dict], list[str]]:
    key = cache_key(node["code"], n)
    with _lock:
        cached = cache.get(key)
    if cached is not None:
        raw_items = cached
    else:
        prompt = TEMPLATE.format(
            kid=node.get("kid") or node.get("teacher") or node["code"],
            teacher=node.get("teacher", ""),
            code=node["code"], grade=node["grade"],
            family=FAMILY_HINT.get(family_of(node["code"]), ""),
            maxwords=MAX_WORDS[node["grade"]],
            cap=GRADE_MAX_WHOLE.get(node["grade"], 1000),
            gradeword=GRADE_WORD[node["grade"]], n=n,
        )
        try:
            out = ask_json(SYSTEM, prompt, max_tokens=4000)
        except Exception as e:                              # noqa: BLE001
            # Keep the provider's own words. Collapsing every failure to
            # "call failed" hid a 403 and a 429 behind what read like a
            # quality problem for two full runs.
            return [], [f"call failed - {str(e)[:160]}"]
        raw_items = out.get("items") if isinstance(out, dict) else None
        if not isinstance(raw_items, list):
            return [], ["reply had no items list"]
        with _lock:
            cache[key] = raw_items

    kept, rejected = [], []
    seen: set[str] = set()
    for raw in raw_items:
        if not isinstance(raw, dict):
            rejected.append("not an object")
            continue
        item, why = check(raw, node)
        if item is None:
            rejected.append(why)
            continue
        if item["stem"] in seen:
            rejected.append("duplicate stem within the batch")
            continue
        seen.add(item["stem"])
        kept.append(item)
    return kept, rejected


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--codes", default="")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--n", type=int, default=6)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--out", default=os.path.join(OUT, "authored_items.json"))
    args = ap.parse_args()

    pack = json.load(io.open(PACK, encoding="utf-8"))
    nodes = pack["nodes"]
    if args.codes:
        want = {c.strip() for c in args.codes.split(",") if c.strip()}
        nodes = [n for n in nodes if n["code"] in want]
    elif not args.all:
        ap.error("pass --codes or --all")

    cache = load_cache()
    kept_all: list[dict] = []
    stats = {"nodes": 0, "kept": 0, "rejected": 0}
    reasons: dict[str, int] = {}

    print(f"generating for {len(nodes)} skills, {args.n} items each, "
          f"{args.workers} workers\n")

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(for_node, n, args.n, cache): n for n in nodes}
        for fut in as_completed(futures):
            node = futures[fut]
            try:
                kept, rejected = fut.result()
            except Exception as e:                          # noqa: BLE001
                kept, rejected = [], [f"crashed: {e}"]
            stats["nodes"] += 1
            stats["kept"] += len(kept)
            stats["rejected"] += len(rejected)
            for r in rejected:
                head = r.split(":")[0][:44]
                reasons[head] = reasons.get(head, 0) + 1
            kept_all.extend(kept)
            print(f"  {node['code']:<13} gr{node['grade']:<2} "
                  f"kept {len(kept)}  rejected {len(rejected)}"
                  + (f"   [{rejected[0][:56]}]" if rejected else ""))

    save_cache(cache)
    # MERGE, do not overwrite. Running this for one family used to wipe every
    # other family's questions out of the file: a pass over Measuring deleted
    # the multi-step word problems for 4.OA.A.3 -- a skill called "Word
    # problems with several steps" -- and left it serving 7 + 3 = ?. The
    # symptom looked like the ranking not working; the cause was destroyed
    # work.
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    merged: dict[tuple[str, str], dict] = {}
    if os.path.exists(args.out):
        try:
            for it in json.load(io.open(args.out, encoding="utf-8")):
                merged[(it["node"], it["stem"])] = it
        except (ValueError, OSError, KeyError):
            pass
    before = len(merged)
    for it in kept_all:
        merged[(it["node"], it["stem"])] = it      # this run wins on a clash
    out_items = list(merged.values())
    with io.open(args.out, "w", encoding="utf-8") as f:
        json.dump(out_items, f, ensure_ascii=False, indent=1)
    print(f"file held {before}, this run kept {len(kept_all)}, "
          f"now {len(out_items)} across "
          f"{len({i['node'] for i in out_items})} skills")

    total = stats["kept"] + stats["rejected"]
    rate = stats["kept"] / total * 100 if total else 0
    print(f"\n{stats['kept']} kept, {stats['rejected']} rejected "
          f"({rate:.0f}% yield) across {stats['nodes']} skills")
    if reasons:
        print("\nwhy items were rejected:")
        for r, c in sorted(reasons.items(), key=lambda kv: -kv[1]):
            print(f"   {c:>4}  {r}")
    print(f"\nwrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
