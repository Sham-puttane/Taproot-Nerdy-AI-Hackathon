"""Gate 1 of the Verifier: symbolic proof, no model involved.

The premise: a generated item does not get to ASSERT that it is correct. It has
to declare its work in a machine-checkable form, and we execute it.

    {"kind": "arithmetic", "expression": "3/4 + 1/6",
     "options": ["4/10", "11/12", "4/24", "2/5"], "answer_index": 1}

SymPy evaluates `expression`, confirms options[answer_index] equals it exactly,
and confirms every other option does not. An item whose maths cannot be checked
is rejected rather than trusted -- which also means a weaker generating model
costs us YIELD, never safety. The model proposes; the maths disposes.

Deliberately model-free. This gate is the load-bearing safety claim ("nothing
unverified reaches a child") and it must not depend on an API key, a rate
limit, or a 7B model's judgement.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from fractions import Fraction
from typing import Any

from sympy import Rational, sympify, simplify
from sympy.core.sympify import SympifyError


# --- grade bands ---------------------------------------------------------
# Denominators a standard actually admits. Taken from the Learning Component
# wording, e.g. 3.NF.A.1 says "where b is 2, 3, 4, 6, or 8" -- so an item
# offering sevenths at grade 3 is off-standard even when the arithmetic is
# perfect, and the child is being tested on something nobody taught her.
GRADE_DENOMINATORS = {
    "1": {2, 4},
    "2": {2, 3, 4},
    "3": {2, 3, 4, 6, 8},
    "4": {2, 3, 4, 5, 6, 8, 10, 12, 100},
    "5": None,          # any denominator
}
GRADE_MAX_WHOLE = {"K": 20, "1": 120, "2": 1000, "3": 1000,
                   "4": 1000000, "5": 1000000}


@dataclass
class Verdict:
    ok: bool
    reasons: list[str] = field(default_factory=list)
    detail: dict[str, Any] = field(default_factory=dict)

    def fail(self, reason: str) -> "Verdict":
        self.ok = False
        self.reasons.append(reason)
        return self


_FRAC_RE = re.compile(r"^\s*(-?\d+)\s*/\s*(\d+)\s*$")
_MIXED_RE = re.compile(r"^\s*(-?\d+)\s+(\d+)\s*/\s*(\d+)\s*$")


def parse_value(text: str):
    """A child-facing answer string -> exact rational. None if unparseable."""
    if text is None:
        return None
    s = str(text).strip()
    if not s:
        return None
    m = _MIXED_RE.match(s)                      # "1 1/2"
    if m:
        whole, num, den = int(m[1]), int(m[2]), int(m[3])
        if den == 0:
            return None
        sign = -1 if whole < 0 else 1
        return Rational(abs(whole) * den + num, den) * sign
    m = _FRAC_RE.match(s)                       # "3/4"
    if m:
        if int(m[2]) == 0:
            return None
        return Rational(int(m[1]), int(m[2]))
    try:                                        # "0.75", "7"
        return Rational(Fraction(s))
    except (ValueError, ZeroDivisionError):
        return None


def denominators(value) -> set[int]:
    try:
        return {int(Rational(value).q)}
    except (TypeError, ValueError):
        return set()


def _check_options(v: Verdict, opts: list[str], idx: int, truth) -> Verdict:
    """Exactly one option is right, and it is the one claimed."""
    if not isinstance(opts, list) or len(opts) < 2:
        return v.fail("needs at least two options")
    if not isinstance(idx, int) or not (0 <= idx < len(opts)):
        return v.fail(f"answer_index {idx} out of range")

    parsed = [parse_value(o) for o in opts]
    for i, (raw, val) in enumerate(zip(opts, parsed)):
        if val is None:
            return v.fail(f"option {i} is not a number: {raw!r}")

    # duplicates -- two identical options make the item unanswerable
    seen: dict[Any, int] = {}
    for i, val in enumerate(parsed):
        if val in seen:
            return v.fail(f"options {seen[val]} and {i} are the same value")
        seen[val] = i

    if simplify(parsed[idx] - truth) != 0:
        return v.fail(
            f"claimed answer {opts[idx]!r} != correct value {truth}")

    for i, val in enumerate(parsed):
        if i == idx:
            continue
        if simplify(val - truth) == 0:
            return v.fail(f"distractor {i} ({opts[i]!r}) is also correct")

    v.detail["truth"] = str(truth)
    v.detail["parsed"] = [str(p) for p in parsed]
    return v


def _check_grade(v: Verdict, grade: str | None, values) -> Verdict:
    if not grade:
        return v
    allowed = GRADE_DENOMINATORS.get(str(grade), None)
    if allowed is not None:
        for val in values:
            for d in denominators(val):
                if d != 1 and d not in allowed:
                    v.fail(f"denominator {d} is off-grade for grade {grade} "
                           f"(allowed: {sorted(allowed)})")
                    return v
    cap = GRADE_MAX_WHOLE.get(str(grade))
    if cap:
        for val in values:
            try:
                if abs(Rational(val).p) > cap * 100:
                    return v.fail(f"numerator exceeds grade-{grade} range")
            except (TypeError, ValueError):
                pass
    return v


def verify_arithmetic(item: dict) -> Verdict:
    v = Verdict(ok=True)
    expr = item.get("expression")
    if not expr:
        return v.fail("no expression to check")
    try:
        truth = sympify(str(expr).replace("x", "*"), rational=True)
    except (SympifyError, TypeError, SyntaxError):
        return v.fail(f"expression does not evaluate: {expr!r}")
    if truth.free_symbols:
        return v.fail("expression contains free symbols")

    v = _check_options(v, item.get("options", []),
                       item.get("answer_index", -1), truth)
    if not v.ok:
        return v
    vals = [parse_value(o) for o in item["options"]] + [truth]
    return _check_grade(v, item.get("grade"), vals)


def verify_compare(item: dict) -> Verdict:
    """{"left": "2/3", "right": "3/4", "options": ["<", ">", "="], ...}"""
    v = Verdict(ok=True)
    a, b = parse_value(item.get("left")), parse_value(item.get("right"))
    if a is None or b is None:
        return v.fail("left/right not parseable")
    truth = "<" if a < b else (">" if a > b else "=")
    opts = item.get("options", [])
    idx = item.get("answer_index", -1)
    if not isinstance(idx, int) or not (0 <= idx < len(opts)):
        return v.fail("answer_index out of range")
    if str(opts[idx]).strip() != truth:
        return v.fail(f"claimed {opts[idx]!r} but {a} {truth} {b}")
    if len(set(map(str, opts))) != len(opts):
        return v.fail("duplicate options")
    v.detail["truth"] = truth
    return _check_grade(v, item.get("grade"), [a, b])


def verify_partition(item: dict) -> Verdict:
    """A shape cut into `parts` pieces, `shaded` of them filled.

    `equal_parts: false` is the 3.NF.A.1 misconception made visible -- and
    then NO fraction is a correct answer, so an item that offers one is
    broken. That check is the whole reason this kind exists.
    """
    v = Verdict(ok=True)
    parts, shaded = item.get("parts"), item.get("shaded")
    equal = item.get("equal_parts", True)
    if not isinstance(parts, int) or parts < 2:
        return v.fail("parts must be an integer >= 2")
    if not isinstance(shaded, int) or not (0 <= shaded <= parts):
        return v.fail("shaded out of range")

    opts, idx = item.get("options", []), item.get("answer_index", -1)
    if not equal:
        if item.get("expects_none_correct") is not True:
            return v.fail("unequal parts cannot name a fraction, but the item "
                          "offers one as correct")
        v.detail["truth"] = "no fraction (parts unequal)"
        return v
    truth = Rational(shaded, parts)
    v = _check_options(v, opts, idx, truth)
    if not v.ok:
        return v
    return _check_grade(v, item.get("grade"), [truth])


KINDS = {
    "arithmetic": verify_arithmetic,
    "compare": verify_compare,
    "partition": verify_partition,
}


def verify(item: dict) -> Verdict:
    """Gate 1. Returns a Verdict; `ok` False means it never reaches a child."""
    v = Verdict(ok=True)
    kind = item.get("kind")
    if kind not in KINDS:
        return v.fail(f"unknown item kind {kind!r} "
                      f"(known: {sorted(KINDS)})")
    stem = (item.get("stem") or "").strip()
    if not stem:
        return v.fail("empty stem")

    # answer leaked into the stem
    opts = item.get("options") or []
    idx = item.get("answer_index", -1)
    if isinstance(idx, int) and 0 <= idx < len(opts):
        ans = str(opts[idx]).strip()
        if len(ans) > 1 and re.search(r"=\s*" + re.escape(ans) + r"\b", stem):
            return v.fail("stem gives the answer away")

    return KINDS[kind](item)
