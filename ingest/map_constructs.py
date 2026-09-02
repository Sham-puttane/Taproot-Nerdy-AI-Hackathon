"""Stage 4: attach misconceptions to the skill graph.

Eedi's ConstructName and Learning Commons' LearningComponent are both granular
skill statements, so they can be matched directly:

    Eedi construct   "Subtract proper fractions with different denominators
                      which do not share a common factor"
    LC component     "Subtract fractions with different denominators by using
                      equivalent fractions"          -> owned by 5.NF.A.1

Matching construct -> component is far better signal than matching a question
to a standard, and it lands the misconception on the exact cone node the game
needs it on.

Embeddings propose; a threshold disposes. Everything below the floor is left
unmapped rather than forced, and `--sample` writes a hand-scoring sheet so the
mapping accuracy we quote is measured rather than assumed.
"""
import argparse, io, json, os, sys, collections

OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")
MODEL = "sentence-transformers/all-MiniLM-L6-v2"
ACCEPT = 0.45   # cosine floor for an automatic mapping
REVIEW = 0.35   # below ACCEPT but above this -> flagged, not dropped silently


def load():
    cone = json.load(io.open(f"{OUT}/cone_fractions.json", encoding="utf-8"))
    eedi = json.load(io.open(f"{OUT}/eedi_elementary.json", encoding="utf-8"))
    return cone, eedi


def build(sample_n=0):
    from sentence_transformers import SentenceTransformer, util

    cone, eedi = load()

    # component text -> owning cone node
    comps, owner = [], []
    for n in cone["nodes"]:
        for c in n["components"]:
            if c and c.strip():
                comps.append(c)
                owner.append(n)
    if not comps:
        sys.exit("no learning components on cone nodes -- run build_dag.py first")

    constructs = eedi["constructs"]
    print(f"embedding {len(constructs)} constructs against {len(comps)} components")

    m = SentenceTransformer(MODEL)
    ec = m.encode(constructs, convert_to_tensor=True, normalize_embeddings=True,
                  show_progress_bar=False)
    ek = m.encode(comps, convert_to_tensor=True, normalize_embeddings=True,
                  show_progress_bar=False)
    sim = util.cos_sim(ec, ek)

    mapping, flagged, unmapped = {}, [], []
    for i, con in enumerate(constructs):
        row = sim[i]
        best = int(row.argmax())
        score = float(row[best])
        node = owner[best]
        rec = {"construct": con, "component": comps[best],
               "node": node["code"], "node_id": node["id"],
               "score": round(score, 4)}
        if score >= ACCEPT:
            mapping[con] = rec
        elif score >= REVIEW:
            flagged.append(rec)
        else:
            unmapped.append(rec)

    # roll misconceptions up onto cone nodes
    per_node = collections.defaultdict(set)
    for r in eedi["records"]:
        hit = mapping.get(r["construct"])
        if hit:
            per_node[hit["node"]].add(r["misconception_id"])

    payload = {
        "model": MODEL, "accept_threshold": ACCEPT, "review_threshold": REVIEW,
        "mapping": mapping, "flagged": flagged, "unmapped": unmapped,
        "misconceptions_by_node": {k: sorted(v) for k, v in per_node.items()},
    }
    json.dump(payload, io.open(f"{OUT}/construct_map.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(f"\nmapped   {len(mapping):>4} / {len(constructs)}  (score >= {ACCEPT})")
    print(f"flagged  {len(flagged):>4}          ({REVIEW} <= score < {ACCEPT})")
    print(f"unmapped {len(unmapped):>4}          (score < {REVIEW})")
    print(f"\ncone nodes carrying misconceptions: {len(per_node)} / {len(cone['nodes'])}")
    top = sorted(per_node.items(), key=lambda kv: -len(kv[1]))[:8]
    for code, ids in top:
        print(f"   {code:<12} {len(ids):>3} misconceptions")

    print("\nstrongest matches:")
    for r in sorted(mapping.values(), key=lambda r: -r["score"])[:5]:
        print(f"   {r['score']:.3f}  {r['node']:<11} {r['construct'][:58]}")
        print(f"           {'':<11} -> {r['component'][:58]}")

    if sample_n:
        import random
        random.seed(11)
        pool = list(mapping.values()) + flagged
        sheet = random.sample(pool, min(sample_n, len(pool)))
        path = f"{OUT}/mapping_review.csv"
        import csv
        with io.open(path, "w", encoding="utf-8", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["score", "eedi_construct", "matched_component",
                        "cone_node", "correct? (y/n)"])
            for r in sorted(sheet, key=lambda r: -r["score"]):
                w.writerow([r["score"], r["construct"], r["component"], r["node"], ""])
        print(f"\n-> {path}  ({len(sheet)} rows to hand-score)")

    print(f"-> {OUT}/construct_map.json")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=0,
                    help="also write N rows to hand-score")
    a = ap.parse_args()
    build(a.sample)
