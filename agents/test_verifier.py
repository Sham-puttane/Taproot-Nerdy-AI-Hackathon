"""Adversarial suite for Gate 1.

Each BROKEN case is a way a generating model actually fails -- a plausible
item whose maths is wrong, whose distractor is secretly correct, whose options
are off-grade, or which gives itself away. Every one must be rejected.

Run: python -m pytest agents/test_verifier.py -q
"""
import pytest

from verifier import verify, parse_value


# --- items that MUST pass ------------------------------------------------
GOOD = [
    ("unlike denominators", {
        "kind": "arithmetic", "grade": "5", "stem": "3/4 + 1/6 = ?",
        "expression": "3/4 + 1/6",
        "options": ["4/10", "11/12", "4/24", "13/12"], "answer_index": 1}),
    ("like denominators, decomposition", {
        "kind": "arithmetic", "grade": "4", "stem": "1/4 + 1/4 + 1/4 = ?",
        "expression": "1/4 + 1/4 + 1/4",
        "options": ["3/12", "3/4", "2/4", "1/12"], "answer_index": 1}),
    ("mixed number answer", {
        "kind": "arithmetic", "grade": "5", "stem": "3/4 + 3/4 = ?",
        "expression": "3/4 + 3/4",
        "options": ["6/8", "1 1/2", "9/16", "1 1/4"], "answer_index": 1}),
    ("comparison", {
        "kind": "compare", "grade": "4", "stem": "Which sign belongs?",
        "left": "2/3", "right": "3/4",
        "options": ["<", ">", "="], "answer_index": 0}),
    ("equal partition", {
        "kind": "partition", "grade": "3",
        "stem": "How much of the bar is shaded?",
        "parts": 4, "shaded": 2,
        "options": ["2/4", "2/2", "4/2", "1/4"], "answer_index": 0}),
    ("cut into equal pieces", {
        "kind": "cut", "grade": "3", "stem": "Cut this bar into 4 equal pieces.",
        "options": [], "answer_index": -1, "target": 4, "tolerance": 0.06}),
    ("place a fraction on the line", {
        "kind": "place", "grade": "3", "stem": "Put 3/4 on the line.",
        "options": [], "answer_index": -1,
        "value": "3/4", "max": 1, "ticks": 4}),
    ("unequal parts, no fraction is right", {
        "kind": "partition", "grade": "3",
        "stem": "Is the shaded piece one quarter?",
        "parts": 4, "shaded": 1, "equal_parts": False,
        "expects_none_correct": True, "options": ["yes", "no"],
        "answer_index": 1}),
]

# --- items that MUST be rejected ----------------------------------------
BROKEN = [
    ("wrong key: adds numerators and denominators", {
        "kind": "arithmetic", "grade": "5", "stem": "3/4 + 1/6 = ?",
        "expression": "3/4 + 1/6",
        "options": ["4/10", "11/12", "4/24", "13/12"], "answer_index": 0}),
    ("distractor is secretly correct (6/8 == 3/4)", {
        "kind": "arithmetic", "grade": "4", "stem": "1/4 + 1/2 = ?",
        "expression": "1/4 + 1/2",
        "options": ["3/4", "6/8", "2/6", "1/8"], "answer_index": 0}),
    ("duplicate options", {
        "kind": "arithmetic", "grade": "4", "stem": "1/4 + 1/4 = ?",
        "expression": "1/4 + 1/4",
        "options": ["1/2", "2/4", "3/4", "1/8"], "answer_index": 0}),
    ("answer_index out of range", {
        "kind": "arithmetic", "grade": "4", "stem": "1/4 + 1/4 = ?",
        "expression": "1/4 + 1/4",
        "options": ["1/2", "3/4"], "answer_index": 7}),
    ("off-grade denominator: sevenths at grade 3", {
        "kind": "arithmetic", "grade": "3", "stem": "1/7 + 2/7 = ?",
        "expression": "1/7 + 2/7",
        "options": ["3/7", "3/14", "2/7", "1/7"], "answer_index": 0}),
    ("unparseable option", {
        "kind": "arithmetic", "grade": "4", "stem": "1/2 + 1/4 = ?",
        "expression": "1/2 + 1/4",
        "options": ["3/4", "about a half", "1/8", "2/6"], "answer_index": 0}),
    ("expression does not evaluate", {
        "kind": "arithmetic", "grade": "4", "stem": "what is it?",
        "expression": "3/4 +++ ",
        "options": ["1", "2"], "answer_index": 0}),
    ("division by zero in an option", {
        "kind": "arithmetic", "grade": "4", "stem": "1/2 + 1/4 = ?",
        "expression": "1/2 + 1/4",
        "options": ["3/4", "1/0", "1/8", "2/6"], "answer_index": 0}),
    ("free symbols in expression", {
        "kind": "arithmetic", "grade": "5", "stem": "n/4 + 1/4 = ?",
        "expression": "n/4 + 1/4",
        "options": ["1/2", "3/4"], "answer_index": 0}),
    ("stem gives the answer away", {
        "kind": "arithmetic", "grade": "5", "stem": "3/4 + 1/6 = 11/12. Which?",
        "expression": "3/4 + 1/6",
        "options": ["4/10", "11/12", "4/24", "13/12"], "answer_index": 1}),
    ("only one option", {
        "kind": "arithmetic", "grade": "4", "stem": "1/2 + 1/4 = ?",
        "expression": "1/2 + 1/4", "options": ["3/4"], "answer_index": 0}),
    ("empty stem", {
        "kind": "arithmetic", "grade": "4", "stem": "   ",
        "expression": "1/2 + 1/4",
        "options": ["3/4", "1/8"], "answer_index": 0}),
    ("unknown kind", {
        "kind": "essay", "grade": "4", "stem": "Explain fractions.",
        "options": ["a", "b"], "answer_index": 0}),
    ("comparison with the wrong sign", {
        "kind": "compare", "grade": "4", "stem": "Which sign?",
        "left": "2/3", "right": "3/4",
        "options": ["<", ">", "="], "answer_index": 1}),
    ("comparison of equal values claimed unequal", {
        "kind": "compare", "grade": "4", "stem": "Which sign?",
        "left": "2/4", "right": "1/2",
        "options": ["<", ">", "="], "answer_index": 0}),
    ("partition: shaded exceeds parts", {
        "kind": "partition", "grade": "3", "stem": "How much is shaded?",
        "parts": 4, "shaded": 6,
        "options": ["6/4", "1/4"], "answer_index": 0}),
    ("partition: fewer than two parts", {
        "kind": "partition", "grade": "3", "stem": "How much is shaded?",
        "parts": 1, "shaded": 1,
        "options": ["1/1", "1/2"], "answer_index": 0}),
    ("partition: unequal parts but a fraction offered as correct", {
        "kind": "partition", "grade": "3", "stem": "How much is shaded?",
        "parts": 4, "shaded": 1, "equal_parts": False,
        "options": ["1/4", "1/3"], "answer_index": 0}),
    ("partition: wrong key", {
        "kind": "partition", "grade": "3", "stem": "How much is shaded?",
        "parts": 4, "shaded": 2,
        "options": ["2/4", "2/8"], "answer_index": 1}),
    ("cut: target below two pieces", {
        "kind": "cut", "grade": "3", "stem": "Cut this bar into 1 equal piece.",
        "options": [], "answer_index": -1, "target": 1, "tolerance": 0.06}),
    ("cut: off-grade target (sevenths at grade 3)", {
        "kind": "cut", "grade": "3", "stem": "Cut this bar into 7 equal pieces.",
        "options": [], "answer_index": -1, "target": 7, "tolerance": 0.06}),
    ("cut: absurd tolerance makes anything 'equal'", {
        "kind": "cut", "grade": "3", "stem": "Cut this bar into 4 equal pieces.",
        "options": [], "answer_index": -1, "target": 4, "tolerance": 0.9}),
    ("place: target does not land on a tick", {
        "kind": "place", "grade": "4", "stem": "Put 1/3 on the line.",
        "options": [], "answer_index": -1,
        "value": "1/3", "max": 1, "ticks": 4}),
    ("place: value outside the line", {
        "kind": "place", "grade": "4", "stem": "Put 5/4 on the line.",
        "options": [], "answer_index": -1,
        "value": "5/4", "max": 1, "ticks": 4}),
    ("decimal distractor equal to the key (0.75 == 3/4)", {
        "kind": "arithmetic", "grade": "5", "stem": "1/4 + 1/2 = ?",
        "expression": "1/4 + 1/2",
        "options": ["3/4", "0.75", "1/8", "2/6"], "answer_index": 0}),
]


@pytest.mark.parametrize("name,item", GOOD, ids=[g[0] for g in GOOD])
def test_good_items_pass(name, item):
    v = verify(item)
    assert v.ok, f"{name}: unexpectedly rejected -> {v.reasons}"


@pytest.mark.parametrize("name,item", BROKEN, ids=[b[0] for b in BROKEN])
def test_broken_items_are_rejected(name, item):
    v = verify(item)
    assert not v.ok, f"{name}: SLIPPED THROUGH -- this would reach a child"
    assert v.reasons, "rejection must say why"


def test_parse_value_forms():
    assert parse_value("3/4") == parse_value("0.75")
    assert parse_value("1 1/2") == parse_value("3/2")
    assert parse_value("7") == 7
    assert parse_value("1/0") is None
    assert parse_value("banana") is None
    assert parse_value("") is None


def test_rejection_names_the_reason():
    v = verify(BROKEN[0][1])
    assert not v.ok
    assert "correct value" in " ".join(v.reasons)
