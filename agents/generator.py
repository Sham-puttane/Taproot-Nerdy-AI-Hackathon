"""Deterministic item generation, driven by misconceptions.

The insight that removes the model from the critical path: a named
misconception is not a description of an error, it is a WRONG ALGORITHM. Eedi
says "When adding fractions, adds the numerators and denominators". That is
executable: (a+c)/(b+d). Run it, and you have a distractor that is precisely
the error this learner makes -- not filler, and not a guess.

So items are built mechanically:

    template  ->  a correct value, computed
    misconception -> a wrong value, computed by the wrong algorithm
    verifier  ->  proves the first right and the rest wrong

No API key, no rate limit, no model quality risk, and it runs offline. A model
is still useful for the natural-language wrapper -- stems that sound like a
person wrote them, coach hints -- but it is not load-bearing for correctness.

Every item produced here is passed through agents.verifier before it is
allowed into a pack. Generated does not mean trusted.
"""
from __future__ import annotations

import itertools
from dataclasses import dataclass
from fractions import Fraction
from typing import Callable, Iterable

from verifier import GRADE_DENOMINATORS, verify


# --- misconception -> wrong algorithm ------------------------------------
# Keys are Eedi MisconceptionName strings (verbatim, so the mapping is
# auditable against the corpus). Values compute what the learner WOULD get.

def _add_num_and_den(a: Fraction, b: Fraction) -> Fraction | None:
    den = a.denominator + b.denominator
    return Fraction(a.numerator + b.numerator, den) if den else None


def _no_common_denominator(a: Fraction, b: Fraction) -> Fraction | None:
    """Adds numerators, keeps the first denominator."""
    return Fraction(a.numerator + b.numerator, a.denominator)


def _multiply_denominators(a: Fraction, b: Fraction) -> Fraction | None:
    den = a.denominator * b.denominator
    return Fraction(a.numerator + b.numerator, den) if den else None


BINARY_MISCONCEPTIONS: dict[str, Callable[[Fraction, Fraction], Fraction | None]] = {
    "When adding fractions, adds the numerators and denominators": _add_num_and_den,
    "Does not find a common denominator when adding/subtracting fractions":
        _no_common_denominator,
    "When adding fractions, multiplies the denominators": _multiply_denominators,
}


@dataclass
class Item:
    kind: str
    stem: str
    options: list[str]
    answer_index: int
    grade: str
    node: str
    misconception: str | None = None
    expression: str | None = None
    left: str | None = None
    right: str | None = None
    parts: int | None = None
    shaded: int | None = None
    equal_parts: bool = True
    expects_none_correct: bool = False

    def to_dict(self) -> dict:
        d = {k: v for k, v in self.__dict__.items() if v is not None}
        return d


def _fmt(f: Fraction) -> str:
    return f"{f.numerator}/{f.denominator}" if f.denominator != 1 else str(f.numerator)


def _distinct(values: Iterable[Fraction]) -> list[Fraction]:
    out: list[Fraction] = []
    for v in values:
        if v is not None and v not in out:
            out.append(v)
    return out


def _legal_denominators(grade: str) -> list[int]:
    allowed = GRADE_DENOMINATORS.get(str(grade))
    return sorted(allowed) if allowed else [2, 3, 4, 5, 6, 8, 10, 12]


# --- templates -----------------------------------------------------------

def gen_addition(node: str, grade: str, misconception: str,
                 unlike: bool = True, limit: int = 12) -> list[Item]:
    """a/b + c/d, with the learner's own error as the lead distractor."""
    wrong_algo = BINARY_MISCONCEPTIONS.get(misconception)
    dens = _legal_denominators(grade)
    out: list[Item] = []

    for b, d in itertools.product(dens, repeat=2):
        if unlike and b == d:
            continue
        if not unlike and b != d:
            continue
        for a in range(1, b):
            for c in range(1, d):
                x, y = Fraction(a, b), Fraction(c, d)
                truth = x + y
                if truth > 2:
                    continue
                cands = [truth]
                if wrong_algo:
                    w = wrong_algo(x, y)
                    if w is not None and w != truth:
                        cands.append(w)
                # Further errors, all computed rather than invented. With LIKE
                # denominators (a+c)/max(b,d) IS the correct answer, so it
                # dedupes away and the item starves for options -- hence the
                # like-denominator specific errors below.
                cands.append(Fraction(a + c, b + d))     # adds denominators too
                cands.append(Fraction(a * c, b * d))     # multiplies through
                cands.append(Fraction(a + c, max(b, d)))
                cands.append(Fraction(max(a, c), max(b, d)))  # keeps one term
                # Drop off-grade distractors before offering them. The verifier
                # would reject the item anyway (multiplying through can produce
                # ninths at grade 4), so filtering here raises yield without
                # weakening the gate -- which still runs on every item.
                legal = set(dens) | {1}
                opts = [o for o in _distinct(cands) if o.denominator in legal]
                if len(opts) < 4 or truth not in opts:
                    continue
                opts = opts[:4]
                if truth not in opts:
                    continue
                order = sorted(opts, key=lambda f: (f.denominator, f.numerator))
                # Fraction auto-reduces, so Fraction(2,4) prints as "1/2" and a
                # like-denominator item would render with unlike denominators --
                # destroying the one thing the item is meant to show. Display
                # from the raw a/b, c/d instead of the normalised value.
                shown = f"{a}/{b} + {c}/{d}"
                item = Item(
                    kind="arithmetic", grade=str(grade), node=node,
                    stem=f"{shown} = ?",
                    expression=shown,
                    options=[_fmt(o) for o in order],
                    answer_index=order.index(truth),
                    misconception=misconception)
                out.append(item)
                if len(out) >= limit:
                    return out
    return out


def gen_partition(node: str, grade: str, misconception: str,
                  limit: int = 12) -> list[Item]:
    """How much is shaded -- and the unequal-parts case, which has no answer.

    The second form is the whole of 3.NF.A.1. A shape cut into four UNEQUAL
    pieces has no quarter in it, so the correct response is "no", and any item
    offering a fraction is broken by construction. The verifier enforces that.
    """
    dens = _legal_denominators(grade)
    out: list[Item] = []
    for parts in dens:
        if parts < 2 or parts > 8:
            continue
        for shaded in range(1, parts):
            truth = Fraction(shaded, parts)
            cands = [
                truth,
                Fraction(shaded, max(parts - shaded, 1)),   # part-to-part, not part-to-whole
                Fraction(parts, shaded),                     # inverted
                Fraction(1, parts),                          # unit fraction reflex
                Fraction(parts - shaded, parts),             # counts the unshaded
            ]
            # "How much is shaded" cannot exceed the whole. An option above 1
            # is filler no child would pick, and filler makes an item easier
            # than it should be.
            opts = [o for o in _distinct(cands) if 0 < o <= 1]
            if len(opts) < 4 or truth not in opts:
                continue
            order = sorted(opts[:4], key=lambda f: (f.denominator, f.numerator))
            out.append(Item(
                kind="partition", grade=str(grade), node=node,
                stem="How much of the shape is shaded?",
                parts=parts, shaded=shaded,
                options=[_fmt(o) for o in order],
                answer_index=order.index(truth),
                misconception=misconception))
            if len(out) >= limit - 2:
                break
        if len(out) >= limit - 2:
            break

    # the equal-parts probe: no fraction is correct
    for parts in (3, 4):
        out.append(Item(
            kind="partition", grade=str(grade), node=node,
            stem=f"This shape is split into {parts} pieces that are NOT the "
                 f"same size. Is the shaded piece one {'third' if parts == 3 else 'quarter'}?",
            parts=parts, shaded=1, equal_parts=False,
            expects_none_correct=True,
            options=["Yes", "No"], answer_index=1,
            misconception="Denominator used for other parts rather than total parts"))
    return out


def gen_compare(node: str, grade: str, misconception: str,
                limit: int = 12) -> list[Item]:
    """Which is bigger. Distractors are the sign, so no value arithmetic."""
    dens = _legal_denominators(grade)
    out: list[Item] = []
    for b, d in itertools.product(dens, repeat=2):
        for a in range(1, b):
            for c in range(1, d):
                x, y = Fraction(a, b), Fraction(c, d)
                if x == y:
                    continue
                truth = "<" if x < y else ">"
                out.append(Item(
                    kind="compare", grade=str(grade), node=node,
                    stem=f"Which sign belongs between {_fmt(x)} and {_fmt(y)}?",
                    left=_fmt(x), right=_fmt(y),
                    options=["<", ">", "="],
                    answer_index=["<", ">", "="].index(truth),
                    misconception=misconception))
                if len(out) >= limit:
                    return out
    return out


def gen_whole(node: str, grade: str, misconception: str,
              limit: int = 12) -> list[Item]:
    """Whole-number addition and multiplication (OA, NBT).

    Covers most of the corridor floor. Distractors are the classic slips --
    off-by-one from counting the starting number, the other operation, and a
    digit-wise result -- all computed, none invented.
    """
    from verifier import GRADE_MAX_WHOLE
    cap = min(GRADE_MAX_WHOLE.get(str(grade), 100), 100)
    out: list[Item] = []
    hi = 12 if cap >= 100 else max(5, cap // 4)
    for a in range(2, hi + 1):
        for b in range(2, hi + 1):
            for op, sym in (("+", "+"), ("*", "×")):
                truth = a + b if op == "+" else a * b
                if truth > cap:
                    continue
                cands = [truth,
                         truth + 1,                       # counted the start
                         (a * b if op == "+" else a + b),  # other operation
                         abs(a - b) or truth + 2]
                opts, seen = [], set()
                for c in cands:
                    if c > 0 and c not in seen:
                        seen.add(c)
                        opts.append(c)
                if len(opts) < 4:
                    continue
                order = sorted(opts[:4])
                out.append(Item(
                    kind="arithmetic", grade=str(grade), node=node,
                    stem=f"{a} {sym} {b} = ?",
                    expression=f"{a} {op} {b}",
                    options=[str(o) for o in order],
                    answer_index=order.index(truth),
                    misconception=misconception))
                if len(out) >= limit:
                    return out
    return out


TEMPLATES = {
    "partition": gen_partition,
    "whole": gen_whole,
    "addition_unlike": lambda n, g, m, limit=12: gen_addition(n, g, m, True, limit),
    "addition_like": lambda n, g, m, limit=12: gen_addition(n, g, m, False, limit),
    "compare": gen_compare,
}


def generate(node: str, grade: str, template: str, misconception: str,
             limit: int = 12) -> tuple[list[dict], list[tuple[dict, list[str]]]]:
    """Generate, then gate. Returns (accepted, rejected_with_reasons)."""
    fn = TEMPLATES.get(template)
    if not fn:
        raise ValueError(f"unknown template {template!r} "
                         f"(known: {sorted(TEMPLATES)})")
    accepted, rejected = [], []
    for item in fn(node, grade, misconception, limit):
        d = item.to_dict()
        v = verify(d)
        (accepted.append(d) if v.ok else rejected.append((d, v.reasons)))
    return accepted, rejected
