#!/usr/bin/env bash
# Reproduces data/raw from public sources. ~914MB total.
set -e
RAW="${TAPROOT_RAW:-D:/taproot/data/raw}"
BASE="https://cdn.learningcommons.org/knowledge-graph/v1.13.0/exports"
mkdir -p "$RAW"
for f in nodes relationships; do
  echo "fetching $f.jsonl ..."
  curl -L "$BASE/$f.jsonl?ref=gh_curl" -o "$RAW/$f.jsonl"
done
echo "Learning Commons KG v1.13.0 — CC BY-4.0."
echo "Coherence Map progressions (c) Student Achievement Partners."
echo
echo "Eedi misconceptions require a Kaggle account:"
echo "  kaggle competitions download -c eedi-mining-misconceptions-in-mathematics -p \"$RAW\""
