"""Stage 5: attach the three naming registers to the cone.

A standard code is an internal identifier. It is fine in a URL, in a tutor
brief, and in this repo; it is never what a child reads. Every node therefore
carries three registers -- `kid`, `teacher`, `reteach` -- and the UI picks by
audience rather than reformatting a code at render time.

Nodes without hand-authored naming are reported, not silently defaulted: a
missing kid name is a node that cannot be shown to a child yet, and that
should be loud.
"""
import io, json, os, sys

OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    cone = json.load(io.open(f"{OUT}/cone_viz.json", encoding="utf-8"))
    naming = json.load(io.open(f"{ROOT}/data/naming.json", encoding="utf-8"))
    names = naming["nodes"]

    named, missing = 0, []
    for n in cone["nodes"]:
        entry = names.get(n["code"])
        if entry:
            n["kid"] = entry["kid"]
            n["teacher"] = entry["teacher"]
            n["reteach"] = entry.get("reteach", "")
            n["concrete"] = entry.get("concrete", "")
            named += 1
        else:
            # explicit placeholder -- never fall back to the code itself
            n["kid"] = None
            n["teacher"] = n["text"][:90]
            n["reteach"] = ""
            n["concrete"] = ""
            missing.append(n["code"])

    json.dump(cone, io.open(f"{OUT}/cone_viz.json", "w", encoding="utf-8"),
              ensure_ascii=False)

    total = len(cone["nodes"])
    print(f"named   {named:>3} / {total}")
    print(f"missing {len(missing):>3}  (cannot be shown to a child yet)")

    # is the demo corridor fully covered? that is the bar that matters now
    demo = set(cone.get("demoPath", []))
    by_id = {n["id"]: n for n in cone["nodes"]}
    gaps = [by_id[i]["code"] for i in demo if by_id.get(i) and not by_id[i]["kid"]]
    print(f"\ndemo corridor ({len(demo)} nodes): "
          + ("fully named" if not gaps else f"MISSING {gaps}"))

    if missing:
        print(f"\nstill unnamed ({len(missing)}):")
        for i in range(0, len(missing), 8):
            print("  " + "  ".join(c.ljust(11) for c in missing[i:i + 8]))
    return 0 if not gaps else 1


if __name__ == "__main__":
    sys.exit(main())
