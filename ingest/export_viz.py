"""Compact the fractions cone for visualization."""
import json, os, sys, networkx as nx
sys.path.insert(0, os.path.dirname(__file__))
from textclean import clean

OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")
SRC = os.environ.get("TAPROOT_CONE", f"{OUT}/graph_k5.json")
DST = os.environ.get("TAPROOT_VIZ", f"{OUT}/cone_viz.json")
c = json.load(open(SRC, encoding="utf-8"))
short = {n["id"]: n["id"][:8] for n in c["nodes"]}

nodes = [{
    "id": short[n["id"]],
    "code": n["code"],
    "grade": (n["code"] or "?").split(".")[0],
    "domain": (n["code"] or "?.?").split(".")[1] if "." in (n["code"] or "") else "?",
    "depth": n["depth"],
    "text": clean(n["description"], drop_examples=True),
    "skills": [clean(s) for s in n["components"][:6]],
} for n in c["nodes"]]
edges = [[short[e["from"]], short[e["to"]]] for e in c["edges"]]

# the canonical descent: deepest chain from a 5.NF target down to a root
G = nx.DiGraph(edges)
by_code = {n["code"]: n["id"] for n in nodes}
target, bedrock = by_code.get("5.NF.A.1"), by_code.get("3.NF.A.1")
demo = []
if target and bedrock and G.has_node(bedrock) and G.has_node(target):
    paths = list(nx.all_simple_paths(G, bedrock, target))
    demo = max(paths, key=len) if paths else []

json.dump({"nodes": nodes, "edges": edges, "demoPath": demo},
          open(DST, "w", encoding="utf-8"))

codes = {n["id"]: n["code"] for n in nodes}
print(f"nodes {len(nodes)}  edges {len(edges)}")
print(f"demo descent path ({len(demo)} nodes):")
print("   " + "  ->  ".join(codes[p] for p in reversed(demo)))
print(f"\nbytes: {os.path.getsize(f'{OUT}/cone_viz.json'):,}")
