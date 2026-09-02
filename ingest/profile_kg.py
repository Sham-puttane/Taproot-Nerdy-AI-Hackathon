"""Day-1 risk check: what is actually in the Learning Commons export?"""
import json, collections, sys, os

RAW = os.environ.get("TAPROOT_RAW", "D:/taproot/data/raw")

def stream(path):
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue

print("=== NODE LABELS ===")
labels = collections.Counter()
for rec in stream(f"{RAW}/nodes.jsonl"):
    labels[tuple(rec.get("labels", []))] += 1
for k, v in labels.most_common(25):
    print(f"{v:>9,}  {'|'.join(k)}")

print("\n=== RELATIONSHIP TYPES (label -> source -> target) ===")
rels = collections.Counter()
for rec in stream(f"{RAW}/relationships.jsonl"):
    rels[(rec.get("label"),
          "|".join(rec.get("source_labels", [])),
          "|".join(rec.get("target_labels", [])))] += 1
for (lab, s, t), v in rels.most_common(30):
    print(f"{v:>9,}  {lab:<28} {s} -> {t}")
