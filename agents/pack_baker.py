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
EXPLICIT = {
    "3.NF.A.1": ("partition", "Denominator used for other parts rather than total parts"),
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


def pick_template(code: str) -> tuple[str, str] | None:
    if code in EXPLICIT:
        return EXPLICIT[code]
    if ".NF.B.3" in code or ".NF.B.4" in code:
        return ("addition_like", LIKE_ADD)
    if ".NF" in code:
        return ("addition_unlike",
                "When adding fractions, adds the numerators and denominators")
    if ".G." in code:
        return ("partition",
                "Denominator used for other parts rather than total parts")
    if ".OA" in code or ".NBT" in code or ".CC" in code:
        return ("whole", "Counts the starting number when counting on")
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


def bake(wall_code: str, per_node: int = 8) -> dict:
    data, nodes, prereqs = load_graph(f"{OUT}/cone_viz.json")
    by_code = {n["code"]: n["id"] for n in data["nodes"]}
    if wall_code not in by_code:
        sys.exit(f"wall {wall_code} is not in the cone")

    ids = corridor(by_code[wall_code], prereqs)
    items, covered, uncovered, rejected = [], [], [], 0

    for nid in sorted(ids, key=lambda i: nodes[i]["depth"]):
        n = nodes[nid]
        pick = pick_template(n["code"])
        if not pick:
            uncovered.append(n["code"])
            continue
        template, misconception = pick
        grade = n["grade"] if n["grade"] != "K" else "1"
        ok, bad = generate(n["code"], grade, template, misconception, per_node)
        rejected += len(bad)
        if not ok:
            uncovered.append(n["code"])
            continue
        for it in ok:
            it["node_id"] = nid
        items.extend(ok)
        covered.append(n["code"])

    pack = {
        "wall": wall_code,
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


def main():
    wall = sys.argv[1] if len(sys.argv) > 1 else "5.NF.A.1"
    pack, uncovered = bake(wall)
    path = f"{OUT}/pack_{wall.replace('.', '_')}.json"
    json.dump(pack, io.open(path, "w", encoding="utf-8"), ensure_ascii=False)
    s = pack["_stats"]

    # every item in a baked pack must carry a passing verification
    bad = [i for i in pack["items"] if not verify(i).ok]

    print(f"wall                {wall}")
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
