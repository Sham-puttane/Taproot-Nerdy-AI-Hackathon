"""Is there a real prerequisite cone under fractions? This decides the product."""
import json, collections, os
RAW = os.environ.get("TAPROOT_RAW", "D:/taproot/data/raw")

def stream(p):
    with open(p, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try: yield json.loads(line)
                except json.JSONDecodeError: pass

# 1. Collect every buildsTowards edge and the node ids it touches
edges, touched = [], set()
for r in stream(f"{RAW}/relationships.jsonl"):
    if r.get("label") == "buildsTowards":
        s, t = r["source_identifier"], r["target_identifier"]
        edges.append((s, t)); touched.add(s); touched.add(t)
print(f"buildsTowards edges: {len(edges):,}   distinct nodes touched: {len(touched):,}")

# 2. Resolve those node ids to human-readable standards
info = {}
frameworks = collections.Counter()
for n in stream(f"{RAW}/nodes.jsonl"):
    if n["identifier"] in touched:
        p = n.get("properties", {})
        info[n["identifier"]] = {
            "code": p.get("statementNotation") or p.get("humanCodingScheme") or p.get("identifier"),
            "grade": p.get("gradeLevel"),
            "subject": p.get("academicSubject"),
            "text": (p.get("description") or p.get("statementLabel") or "")[:90],
        }
        frameworks[p.get("frameworkTitle") or p.get("provider")] += 1
print(f"resolved {len(info):,} of {len(touched):,} touched nodes")
print("\nframeworks represented:", dict(frameworks.most_common(5)))

print("\n=== sample edges (prereq -> builds toward) ===")
for s, t in edges[:12]:
    a, b = info.get(s, {}), info.get(t, {})
    print(f"  {a.get('code','?'):<12} -> {b.get('code','?'):<12}  | {b.get('text','')[:60]}")

# 3. Codes present, grouped by domain prefix
codes = collections.Counter()
for i in info.values():
    c = i.get("code") or "?"
    codes[c.split(".")[0] + "." + (c.split(".")[1] if "." in c and len(c.split("."))>1 else "")] += 1
print("\n=== grade.domain buckets in the buildsTowards subgraph ===")
for k, v in sorted(codes.items()):
    print(f"  {v:>4}  {k}")
