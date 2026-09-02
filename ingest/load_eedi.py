"""Stage 3: the misconception corpus.

Eedi is a UK-authored K-12 set and skews secondary -- of 1,869 questions, most
sit in algebra. We keep the elementary band only: fraction/number-sense
constructs that plausibly touch grades 2-5, with anything algebraic excluded.

Output is long-format: one record per (question, distractor, misconception),
which is the shape the retriever and the item generator both want.
"""
import csv, io, json, os, re, sys, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from textclean import clean

RAW = os.environ.get("TAPROOT_RAW", "D:/taproot/data/raw")
OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")
EEDI = f"{RAW}/eedi"

# Subjects that plausibly reach grades 2-5. Everything else in Eedi is
# secondary. Kept explicit rather than heuristic so the boundary is auditable.
ELEMENTARY_SUBJECTS = {
    "Adding and Subtracting Fractions", "Multiplying Fractions",
    "Dividing Fractions", "Ordering Fractions", "Fractions of an Amount",
    "Equivalent Fractions", "Converting between Fractions and Decimals",
    "Place Value", "Mental Multiplication and Division",
    "Written Multiplication", "Written Division",
    "Multiplying and Dividing with Decimals",
    "Adding and Subtracting Negative Numbers",
    "Rounding to the Nearest Whole",
}
ALGEBRAIC = re.compile(
    r"algebra|index|indices|quadratic|surd|equation|expression|sequence"
    r"|formula|substitut", re.I)


def main():
    misc = {
        r["MisconceptionId"]: r["MisconceptionName"]
        for r in csv.DictReader(io.open(f"{EEDI}/misconception_mapping.csv",
                                        encoding="utf-8"))
    }
    rows = list(csv.DictReader(io.open(f"{EEDI}/train.csv", encoding="utf-8")))

    kept, skipped_no_misc = [], 0
    for r in rows:
        if r["SubjectName"] not in ELEMENTARY_SUBJECTS:
            continue
        if ALGEBRAIC.search(r["ConstructName"]):
            continue
        correct = r["CorrectAnswer"]
        for letter in "ABCD":
            if letter == correct:
                continue
            raw_id = r[f"Misconception{letter}Id"]
            if not raw_id:
                skipped_no_misc += 1
                continue
            mid = str(int(float(raw_id)))
            name = misc.get(mid)
            if not name:
                continue
            kept.append({
                "question_id": r["QuestionId"],
                "construct": clean(r["ConstructName"]),
                "subject": r["SubjectName"],
                "stem": clean(r["QuestionText"]),
                "correct": clean(r[f"Answer{correct}Text"]),
                "distractor": clean(r[f"Answer{letter}Text"]),
                "misconception_id": mid,
                "misconception": clean(name),
            })

    constructs = sorted({k["construct"] for k in kept})
    mids = {k["misconception_id"] for k in kept}
    payload = {
        "records": kept,
        "constructs": constructs,
        "misconceptions": {m: clean(misc[m]) for m in sorted(mids)},
    }
    os.makedirs(OUT, exist_ok=True)
    json.dump(payload, io.open(f"{OUT}/eedi_elementary.json", "w",
                               encoding="utf-8"), ensure_ascii=False)

    qs = {k["question_id"] for k in kept}
    print(f"source questions            {len(rows):,}")
    print(f"elementary questions kept   {len(qs):,}")
    print(f"distractor records          {len(kept):,}")
    print(f"distinct misconceptions     {len(mids):,}")
    print(f"distinct constructs         {len(constructs):,}")
    print(f"distractors w/o a label     {skipped_no_misc:,} (dropped)")
    print(f"-> {OUT}/eedi_elementary.json")

    print("\nsample record:")
    ex = next(k for k in kept if "fraction" in k["construct"].lower())
    for key in ("construct", "stem", "correct", "distractor", "misconception"):
        print(f"  {key:<14} {ex[key][:86]}")


if __name__ == "__main__":
    main()
