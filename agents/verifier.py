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


def verify_cut(item: dict) -> Verdict:
    """Hands-on: cut a bar into `target` equal pieces yourself.

    There is no option list, because the point is that the child performs the
    partition rather than recognising one. Multiple choice cannot teach
    3.NF.A.1 -- "equal parts" is a thing you do, and a child can pick the right
    picture while still believing four pieces of any size make quarters.
    """
    v = Verdict(ok=True)
    target = item.get("target")
    if not isinstance(target, int) or not (2 <= target <= 12):
        return v.fail("target must be an integer between 2 and 12")
    tol = item.get("tolerance", 0.06)
    if not isinstance(tol, (int, float)) or not (0.01 <= tol <= 0.2):
        return v.fail("tolerance must be between 0.01 and 0.2")
    return _check_grade(v, item.get("grade"), [Rational(1, target)])


def verify_place(item: dict) -> Verdict:
    """Hands-on: drag a marker to where a fraction sits on a number line."""
    v = Verdict(ok=True)
    val = parse_value(item.get("value"))
    if val is None:
        return v.fail(f"value not parseable: {item.get('value')!r}")
    hi = item.get("max", 1)
    if not isinstance(hi, int) or hi < 1:
        return v.fail("max must be a positive integer")
    if not (0 < val <= hi):
        return v.fail(f"value {val} outside 0..{hi}")
    ticks = item.get("ticks")
    if not isinstance(ticks, int) or ticks < 2:
        return v.fail("ticks must be an integer >= 2")
    # the target must actually land on a tick, or it is unanswerable
    if (val * ticks).q != 1:
        return v.fail(f"{val} does not sit on any of {ticks} ticks")
    return _check_grade(v, item.get("grade"), [val])


def verify_word(item: dict) -> Verdict:
    """A word problem, checked by making the author show its work.

    A story has no closed form to sympify, so a naive gate could only check
    that four options look like numbers -- which would let a model state a
    story, state an answer, and be believed. That is exactly what this project
    refuses to do.

    So an authored word problem must carry the COMPUTATION it claims to
    describe ("(72 - 18)/9"). SymPy evaluates that, and the item is rejected
    unless the arithmetic the author showed actually produces the answer the
    author stated. A model that reasons badly fails a check rather than
    reaching a child, and the failure is visible in the reject log.
    """
    v = Verdict(ok=True)
    expr = item.get("expression")
    if not expr:
        return v.fail("word problem has no expression to check its answer")
    try:
        truth = sympify(str(expr).replace("x", "*"), rational=True)
    except (SympifyError, TypeError, SyntaxError):
        return v.fail(f"expression does not evaluate: {expr!r}")
    if truth.free_symbols:
        return v.fail("expression contains free symbols")

    opts = item.get("options", [])
    idx = item.get("answer_index", -1)
    if isinstance(idx, bool) or not isinstance(idx, int) \
            or not (0 <= idx < len(opts)):
        return v.fail("answer_index out of range")

    claimed = parse_value(opts[idx])
    if claimed is None:
        return v.fail(f"stated answer {opts[idx]!r} is not a number")
    if claimed != truth:
        return v.fail(
            f"the working {expr!r} gives {truth}, but the item claims "
            f"{opts[idx]!r} -- the author's own arithmetic disagrees")

    v = _check_options(v, opts, idx, truth)
    if not v.ok:
        return v
    vals = [parse_value(o) for o in opts] + [truth]
    return _check_grade(v, item.get("grade"), vals)


def verify_numberline(item: dict) -> Verdict:
    """Drag a number to its place on a line running min..max.

    Generalises `place`, which only knew fractions between 0 and 1. The one
    check that actually matters is the same: the target has to LAND on a tick.
    A number that falls between two ticks cannot be placed, so the child is
    being asked to do something impossible and will be marked wrong for it.
    """
    v = Verdict(ok=True)
    val = parse_value(item.get("value"))
    if val is None:
        return v.fail(f"value not parseable: {item.get('value')!r}")

    lo = item.get("min", 0)
    hi = item.get("max", 1)
    if not isinstance(lo, int) or not isinstance(hi, int):
        return v.fail("min and max must be integers")
    if hi <= lo:
        return v.fail(f"max {hi} must be greater than min {lo}")
    if not (lo <= val <= hi):
        return v.fail(f"value {val} outside the line {lo}..{hi}")

    ticks = item.get("ticks")
    if not isinstance(ticks, int) or ticks < 2:
        return v.fail("ticks must be an integer >= 2")
    if ticks > 24:
        return v.fail(f"{ticks} ticks is more than a child can count")

    # ((val - lo) / (hi - lo)) * ticks must be a whole number
    pos = Rational(val - lo, hi - lo) * ticks
    if pos.q != 1:
        return v.fail(f"{val} does not land on any of the {ticks} ticks "
                      f"between {lo} and {hi}")
    return _check_grade(v, item.get("grade"), [val])


def verify_groups(item: dict) -> Verdict:
    """Build an array of `rows` x `cols`.

    Bounded at 12 because past that the dots stop being countable, which is
    the entire reason for using an array rather than a number.
    """
    v = Verdict(ok=True)
    rows, cols = item.get("rows"), item.get("cols")
    for name, n in (("rows", rows), ("cols", cols)):
        if not isinstance(n, int) or isinstance(n, bool):
            return v.fail(f"{name} must be an integer, got {n!r}")
        if not (1 <= n <= 12):
            return v.fail(f"{name}={n} outside 1..12; an array past 12 "
                          f"cannot be counted by eye")
    product = rows * cols
    stated = item.get("total")
    if stated is not None and stated != product:
        return v.fail(f"total {stated} but {rows} x {cols} = {product}")
    return _check_grade(v, item.get("grade"), [Rational(product)])


def verify_balance(item: dict) -> Verdict:
    """a and b on one pan; `given` plus her blocks on the other.

    The check that matters is that `given` leaves a real question. If the pan
    she is filling starts empty, she can count the other side and copy the
    total, and the item tests counting rather than what "=" means. If `given`
    already equals or exceeds the target there is nothing to add, which is not
    a task either.
    """
    v = Verdict(ok=True)
    a, b, given = item.get("a"), item.get("b"), item.get("given")
    for name, n in (("a", a), ("b", b), ("given", given)):
        if isinstance(n, bool) or not isinstance(n, int):
            return v.fail(f"{name} must be an integer, got {n!r}")
        if n < 0:
            return v.fail(f"{name}={n} cannot be negative")

    target = a + b
    if target > 20:
        return v.fail(f"{a} + {b} = {target}, past the 20 the blocks can show")
    if target == 0:
        return v.fail("an empty balance has nothing to work out")
    if given < 1:
        return v.fail("given must be at least 1, or she can copy the total "
                      "off the other pan and this tests counting")
    if given >= target:
        return v.fail(f"given={given} leaves nothing to add against a target "
                      f"of {target}")

    stated = item.get("answer")
    if stated is not None and stated != target - given:
        return v.fail(f"answer {stated} but {target} - {given} = {target - given}")
    return _check_grade(v, item.get("grade"), [Rational(target)])


KINDS = {
    "arithmetic": verify_arithmetic,
    "compare": verify_compare,
    "partition": verify_partition,
    "cut": verify_cut,
    "place": verify_place,
    "word": verify_word,
    "numberline": verify_numberline,
    "groups": verify_groups,
    "balance": verify_balance,
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
