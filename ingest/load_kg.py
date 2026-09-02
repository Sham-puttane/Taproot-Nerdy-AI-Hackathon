"""Stage 1: extract the math prerequisite graph + learning components from the
Learning Commons export.

Edge semantics (verified against the data): a `buildsTowards` edge (s -> t)
means s is a PREREQUISITE of t.  Chains read bottom-up: K.MD -> ... -> 5.NF.
"""
import json, os, collections

RAW = os.environ.get("TAPROOT_RAW", "D:/taproot/data/raw")
OUT = os.environ.get("TAPROOT_OUT", "D:/taproot/data/processed")
os.makedirs(OUT, exist_ok=True)


def stream(path):
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue


def jparse(v, default=None):
    """Properties are JSON-encoded strings, not native arrays."""
    if not v:
        return default
    try:
        return json.loads(v)
    except (json.JSONDecodeError, TypeError):
        return v


# --- pass 1: every buildsTowards / relatesTo edge, and the nodes they touch ---
prereq_edges, related_edges, touched = [], [], set()
for r in stream(f"{RAW}/relationships.jsonl"):
    lab = r.get("label")
    if lab in ("buildsTowards", "relatesTo"):
        s, t = r["source_identifier"], r["target_identifier"]
        (prereq_edges if lab == "buildsTowards" else related_edges).append((s, t))
        touched.update((s, t))

# --- pass 2: resolve those standards, and collect learning components ---
standards, comp_supports = {}, collections.defaultdict(list)
components = {}
for n in stream(f"{RAW}/nodes.jsonl"):
    labels, nid, p = n.get("labels", []), n["identifier"], n.get("properties", {})
    if "StandardsFrameworkItem" in labels and nid in touched:
        standards[nid] = {
            "id": nid,
            "code": p.get("statementCode"),
            "grades": jparse(p.get("gradeLevel"), []),
            "subject": p.get("academicSubject"),
            "description": p.get("description", ""),
            "type": p.get("normalizedStatementType"),
        }
    elif "LearningComponent" in labels:
        components[nid] = {"id": nid,
                           "text": p.get("description", "")}

# --- pass 3: LearningComponent -supports-> StandardsFrameworkItem ---
for r in stream(f"{RAW}/relationships.jsonl"):
    if r.get("label") == "supports":
        s, t = r["source_identifier"], r["target_identifier"]
        if t in standards and s in components:
            comp_supports[t].append(s)

kept_components = {cid: components[cid]
                   for lst in comp_supports.values() for cid in lst}

payload = {
    "standards": standards,
    "prereq_edges": prereq_edges,
    "related_edges": related_edges,
    "components": kept_components,
    "component_supports": {k: v for k, v in comp_supports.items()},
}
with open(f"{OUT}/kg_math.json", "w", encoding="utf-8") as fh:
    json.dump(payload, fh)

print(f"standards          {len(standards):,}")
print(f"prereq edges       {len(prereq_edges):,}")
print(f"relatesTo edges    {len(related_edges):,}")
print(f"learning components{len(kept_components):>7,}  "
      f"(attached to {len(comp_supports):,} standards)")
print(f"-> {OUT}/kg_math.json")
