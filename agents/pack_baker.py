"""Bake a Learning Pack: everything the child needs offline, for one wall.

Scope decision: a pack covers the FULL descent corridor -- the wall problem
plus every skill it transitively rests on -- not a fixed radius around the
current frontier. A radius is cheaper to bake and breaks at exactly the wrong
moment: the child starts a descent, walks past the cached edge, and the app
that promised to work offline stops working mid-diagnosis. The corridor is
computable up front (it is what `seedFromWall` already scopes to), so the
offline guarantee can be unconditional instead of probabilistic.

Template selection is data-driven rather than hand-assigned: the standard's
domain says which instrument fits it. G and the partition-flavoured NF
standards want a shape to cut; NF addition wants fraction arithmetic; the
comparison standards want an ordering. That is four instruments covering the
cone, chosen by code, not seventy-seven hand-built mini-games.
"""
from __future__ import annotations

import io, json, os, sys, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generator import generate            # noqa: E402
from verifier import verify               # noqa: E402

OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")

# node code -> (template, default misconception)
# Where a manipulative teaches the idea and multiple choice cannot, use the
# manipulative. 3.NF.A.1 is "equal parts", which is a thing you DO; 3.NF.A.2 is
# where a fraction becomes a point on a line, which is spatial.
# A conceptual node needs BOTH kinds of item: a quick one for the descent,
# where eight fast reads matter and dragging would exhaust the learner, and a
# hands-on one for the repair, where she is staying a while and the instrument
# earns its time. Listing several templates per node is how that happens.
EXPLICIT = {
    "3.NF.A.1": (["cut", "partition"],
                 "Denominator used for other parts rather than total parts"),
    "3.NF.A.2": (["place", "partition"],
                 "Denominator used for other parts rather than total parts"),
    "2.G.A.3":  ("partition", "Denominator used for other parts rather than total parts"),
    "2.G.A.2":  ("partition", "Denominator used for other parts rather than total parts"),
    "1.G.A.3":  ("partition", "Denominator used for other parts rather than total parts"),
    "1.G.A.2":  ("partition", "Denominator used for other parts rather than total parts"),
    "3.NF.A.3": ("compare",   "Denominator used for other parts rather than total parts"),
    "4.NF.A.2": ("compare",   "Denominator used for other parts rather than total parts"),
    "4.NF.A.1": ("compare",   "Denominator used for other parts rather than total parts"),
    "5.NF.A.1": ("addition_unlike",
                 "When adding fractions, adds the numerators and denominators"),
    "5.NF.A.2": ("addition_unlike",
                 "When adding fractions, adds the numerators and denominators"),
}
LIKE_ADD = "Does not find a common denominator when adding/subtracting fractions"


def pick_template(code: str):
    """Returns (templates, misconception) -- templates is always a list."""
    if code in EXPLICIT:
        tpl, mis = EXPLICIT[code]
        return ([tpl] if isinstance(tpl, str) else list(tpl)), mis
    if ".NF.B.3" in code or ".NF.B.4" in code:
        return (["addition_like"], LIKE_ADD)
    if ".NF" in code:
        return (["addition_unlike"],
                "When adding fractions, adds the numerators and denominators")
    if ".G." in code:
        return (["partition"],
                "Denominator used for other parts rather than total parts")
    if ".OA" in code or ".NBT" in code or ".CC" in code:
        return (["whole"], "Counts the starting number when counting on")
    if ".MD" in code:
        # Measurement has no instrument of its own yet. Whole-number arithmetic
        # is a stand-in so these skills are at least reachable; a proper
        # two-rulers instrument is still owed, and 2.MD.A.2 in particular
        # deserves one -- "bigger unit, smaller number" IS the denominator idea
        # three years early.
        return (["whole"], "Counts the starting number when counting on")
    return None                     # no instrument yet -- reported, not faked


def load_graph(path: str):
    d = json.load(io.open(path, encoding="utf-8"))
    nodes = {n["id"]: n for n in d["nodes"]}
    prereqs = collections.defaultdict(list)
    for e in d["edges"]:
        f, t = (e["from"], e["to"]) if isinstance(e, dict) else (e[0], e[1])
        prereqs[t].append(f)
    return d, nodes, prereqs


def corridor(root: str, prereqs) -> set[str]:
    seen, stack = {root}, [root]
    while stack:
        for p in prereqs.get(stack.pop(), []):
            if p not in seen:
                seen.add(p)
                stack.append(p)
    return seen


def bake(wall_codes, per_node: int = 8) -> dict:
    """Bake one pack covering EVERY wall the picker can offer.

    One pack per wall would mean a download each time a child changes topic,
    and the corridors overlap heavily anyway -- fractions and word problems
    share most of their floor. The union is barely larger than the largest
    single corridor and it means every topic works offline from the moment the
    app is installed, which is the promise we actually made.
    """
    if isinstance(wall_codes, str):
        wall_codes = [wall_codes]
    data, nodes, prereqs = load_graph(f"{OUT}/cone_viz.json")
    by_code = {n["code"]: n["id"] for n in data["nodes"]}
    missing = [w for w in wall_codes if w not in by_code]
    if missing:
        sys.exit(f"walls not in the cone: {missing}")

    ids = set()
    for w in wall_codes:
        ids |= corridor(by_code[w], prereqs)
    items, covered, uncovered, rejected = [], [], [], 0

    for nid in sorted(ids, key=lambda i: nodes[i]["depth"]):
        n = nodes[nid]
        pick = pick_template(n["code"])
        if not pick:
            uncovered.append(n["code"])
            continue
        templates, misconception = pick
        grade = n["grade"] if n["grade"] != "K" else "1"
        got = []
        for template in templates:
            # The standard's own wording decides the operation: "Add and
            # subtract within 20" must not serve multiplication.
            ok, bad = generate(n["code"], grade, template, misconception,
                               per_node, n.get("text", ""))
            rejected += len(bad)
            got.extend(ok)
        if not got:
            uncovered.append(n["code"])
            continue
        for it in got:
            it["node_id"] = nid
        items.extend(got)
        covered.append(n["code"])

    pack = {
        "wall": wall_codes[0],
        "walls": list(wall_codes),
        "corridor": sorted(nodes[i]["code"] for i in ids),
        "nodes": [
            {k: nodes[i][k] for k in
             ("id", "code", "grade", "depth", "text", "kid", "teacher", "reteach")
             if k in nodes[i]}
            for i in ids
        ],
        "edges": [[f, t] for f, t in
                  ((e["from"], e["to"]) if isinstance(e, dict) else (e[0], e[1])
                   for e in data["edges"])
                  if f in ids and t in ids],
        "items": items,
    }
    pack["_stats"] = {
        "corridor_nodes": len(ids),
        "nodes_with_items": len(covered),
        "nodes_without_items": len(uncovered),
        "items": len(items),
        "rejected_by_verifier": rejected,
    }
    return pack, uncovered


# Every wall the picker can offer. Kept here so the pack and the picker
# cannot drift apart -- a topic the app offers but the pack does not cover
# would be a dead end for a child with no network.
ALL_WALLS = [
    # Fractions
    "5.NF.A.1", "4.NF.B.3.d", "3.NF.A.3", "3.NF.A.1",
    # Times tables & word problems
    "4.OA.A.3", "3.OA.D.8", "2.OA.A.1", "1.OA.C.6",
    # Big numbers & place value
    "5.NBT.B.7", "4.NBT.B.5", "2.NBT.B.5", "1.NBT.C.4",
    # Measuring & data
    "5.MD.A.1", "4.MD.A.2", "3.MD.D.8",
    # Shapes
    "5.G.B.4", "3.G.A.2",
]


def main():
    walls = sys.argv[1:] or ALL_WALLS
    pack, uncovered = bake(walls)
    path = f"{OUT}/pack.json"
    json.dump(pack, io.open(path, "w", encoding="utf-8"), ensure_ascii=False)
    s = pack["_stats"]

    # every item in a baked pack must carry a passing verification
    bad = [i for i in pack["items"] if not verify(i).ok]

    print(f"walls               {len(pack['walls'])}: {', '.join(pack['walls'])}")
    print(f"corridor nodes      {s['corridor_nodes']}")
    print(f"nodes with items    {s['nodes_with_items']}")
    print(f"nodes WITHOUT items {s['nodes_without_items']}")
    print(f"items               {s['items']}")
    print(f"rejected by gate    {s['rejected_by_verifier']}")
    print(f"re-check failures   {len(bad)}  {'OK' if not bad else 'PACK IS UNSAFE'}")
    print(f"pack size           {os.path.getsize(path)/1024:.0f} KB")
    print(f"-> {path}")
    if uncovered:
        print(f"\nno instrument yet ({len(uncovered)}):")
        for i in range(0, len(uncovered), 8):
            print("  " + "  ".join(c.ljust(11) for c in uncovered[i:i + 8]))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
