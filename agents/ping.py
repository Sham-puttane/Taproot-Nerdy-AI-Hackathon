"""Ask each provider one REAL question and print exactly what came back.

Not a token probe. A probe that spends less than a real request tells you the
key parses and nothing about whether the thing we depend on works -- and a run
where 70 of 87 rejections were "call failed" is precisely the case where the
difference matters. This sends the same shape of request the generator sends
and prints the raw error when it fails.

Run:  python agents/ping.py
"""
from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request
import json
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm import PROVIDERS                                   # noqa: E402

SYSTEM = "You write mathematics questions for children. Return ONLY JSON."
USER = ('Write 2 grade-2 addition questions. Return {"items":[{"stem":"...",'
        '"expression":"3+4","answer":"7","options":["7","6","8","5"],'
        '"answer_index":0}]}')


def main() -> int:
    any_ok = False
    for p in PROVIDERS:
        key = os.environ.get(p["env"], "").strip()
        if not key:
            print(f"\n{p['name']}: {p['env']} not set — skipped")
            continue
        print(f"\n{p['name']}  ({len(p['models'])} models)")
        for model in p["models"]:
            body = json.dumps({
                "model": model,
                "messages": [{"role": "system", "content": SYSTEM},
                             {"role": "user", "content": USER}],
                "max_tokens": 700,
                "temperature": 0.4,
            }).encode()
            req = urllib.request.Request(
                p["url"], data=body, method="POST",
                headers={"Authorization": f"Bearer {key}",
                         "Content-Type": "application/json",
                         "HTTP-Referer": "https://github.com/Sham-puttane/Taproot-Nerdy-AI-Hackathon",
                         "X-Title": "Taproot"})
            t0 = time.time()
            try:
                with urllib.request.urlopen(req, timeout=90) as r:
                    payload = json.loads(r.read().decode())
                text = (payload["choices"][0]["message"]["content"] or "")[:70]
                print(f"   OK    {model:<42} {time.time()-t0:5.1f}s  {text!r}")
                any_ok = True
            except urllib.error.HTTPError as e:
                detail = e.read().decode("utf-8", "replace")
                print(f"   HTTP{e.code} {model:<42} {detail[:220]}")
            except Exception as e:                          # noqa: BLE001
                print(f"   ERR   {model:<42} {type(e).__name__}: {str(e)[:180]}")
    print("\nat least one provider is usable" if any_ok
          else "\nNO provider is currently usable")
    return 0 if any_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
