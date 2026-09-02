"""Stage 2: assemble the prerequisite DAG, verify acyclicity, extract the
fractions cone, and emit graph.json for the client.

The cone = 5.NF/4.NF/3.NF plus the full ancestor closure of everything they
depend on.  Per the Coherence Map that closure reaches down into measurement
(2.MD, 1.MD, K.MD) -- fraction sense grows out of partitioning and unit
iteration, which is exactly the descent the game needs.
"""
import json, os, networkx as nx

OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")
kg = json.load(open(f"{OUT}/kg_math.json", encoding="utf-8"))
S = kg["standards"]

G = nx.DiGraph()
for nid, s in S.items():
    G.add_node(nid, **s)
for s, t in kg["prereq_edges"]:      # s is a prerequisite of t
    if s in S and t in S:
        G.add_edge(s, t)

print(f"graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

# --- acyclicity ---
if nx.is_directed_acyclic_graph(G):
    print("acyclic: YES")
else:
    cycles = list(nx.simple_cycles(G))
    print(f"acyclic: NO -- {len(cycles)} cycles; breaking by removing back-edges")
    for cyc in cycles:
        if G.has_edge(cyc[-1], cyc[0]):
            G.remove_edge(cyc[-1], cyc[0])
    print("acyclic after repair:", nx.is_directed_acyclic_graph(G))

# --- topological depth (0 = most foundational) ---
depth = {}
for nid in nx.topological_sort(G):
    preds = list(G.predecessors(nid))
    depth[nid] = 0 if not preds else max(depth[p] for p in preds) + 1
nx.set_node_attributes(G, depth, "depth")
print(f"max depth: {max(depth.values())}")

# --- the fractions cone: NF targets + full ancestor closure ---
targets = [n for n, d in G.nodes(data=True)
           if d.get("code") and ".NF" in d["code"] and d["code"][0] in "345"]
cone = set(targets)
for t in targets:
    cone |= nx.ancestors(G, t)
C = G.subgraph(cone).copy()
print(f"\nfractions cone: {C.number_of_nodes()} nodes, {C.number_of_edges()} edges")

by_grade = {}
for n, d in C.nodes(data=True):
    g = (d.get("code") or "?").split(".")[0]
    by_grade[g] = by_grade.get(g, 0) + 1
print("cone by grade:", dict(sorted(by_grade.items())))

roots = [n for n in C if C.in_degree(n) == 0]
leaves = [n for n in C if C.out_degree(n) == 0]
print(f"entry points (no prereqs): {sorted(C.nodes[n]['code'] for n in roots)}")
print(f"top of cone: {sorted(C.nodes[n]['code'] for n in leaves)[:8]}")

# --- emit for the client + downstream stages ---
comp = kg["component_supports"]
out = {
    "nodes": [
        {"id": n, "code": d["code"], "description": d["description"],
         "grades": d["grades"], "depth": d["depth"],
         "components": [kg["components"][c]["text"]
                        for c in comp.get(n, []) if c in kg["components"]][:12]}
        for n, d in C.nodes(data=True)
    ],
    "edges": [{"from": s, "to": t} for s, t in C.edges()],
}
json.dump(out, open(f"{OUT}/cone_fractions.json", "w", encoding="utf-8"))
n_comp = sum(len(n["components"]) for n in out["nodes"])
print(f"\n-> {OUT}/cone_fractions.json  ({n_comp} learning components on cone nodes)")
