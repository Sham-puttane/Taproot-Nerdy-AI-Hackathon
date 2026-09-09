"""The only place a model is called, and it is never at runtime.

Taproot's shipped game makes ZERO model calls. This module runs at BUILD time
only: it proposes items, `verifier.py` executes the maths, and anything that
fails is rejected rather than shipped. So a bad model costs us YIELD -- fewer
items in the pack -- and can never cost a child a wrong answer.

That is the whole reason a free tier is acceptable here. Quality affects how
many proposals survive; it cannot affect correctness, because correctness is
decided by SymPy downstream and not by the thing that wrote the question.

Key comes from OPENROUTER_API_KEY. It is never read from a file in the repo,
never logged, and never sent anywhere but openrouter.ai. If it is missing this
raises immediately rather than falling back to unverified content.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

# Two providers, both free tier, both OpenAI-shaped so one code path serves
# them. Groq goes first purely on speed: OpenRouter's free tier was taking
# 30-60s per item, which caps how much of the pack can be regenerated in the
# days available. Groq answers in seconds. OpenRouter is the fallback, so a
# rate limit on one does not stop a build.
PROVIDERS = [
    {
        "name": "groq",
        "env": "GROQ_API_KEY",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "models": ["openai/gpt-oss-120b", "qwen/qwen3.8-27b",
                   "openai/gpt-oss-20b"],
    },
    {
        "name": "openrouter",
        "env": "OPENROUTER_API_KEY",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "models": ["nvidia/nemotron-3-ultra-550b-a55b:free",
                   "google/gemma-4-31b-it:free",
                   "nvidia/nemotron-3-super-120b-a12b:free"],
    },
]


class NoKey(RuntimeError):
    pass


def available() -> list[dict]:
    """Providers we actually hold a key for, in preference order."""
    live = [p for p in PROVIDERS if os.environ.get(p["env"], "").strip()]
    if not live:
        raise NoKey(
            "No generation key set. Wanted GROQ_API_KEY or OPENROUTER_API_KEY.\n"
            "  PowerShell:  setx GROQ_API_KEY \"gsk_...\"   (then a NEW terminal)\n"
            "Generation refuses to run without one rather than shipping "
            "unverified items."
        )
    return live


@dataclass
class Reply:
    text: str
    model: str
    seconds: float


def ask(
    system: str,
    user: str,
    *,
    models: list[str] | None = None,
    max_tokens: int = 1600,
    temperature: float = 0.4,
    retries: int = 2,
    timeout: int = 120,
) -> Reply:
    """One completion, falling through providers and then models."""
    last: Exception | None = None

    for provider in available():
        key = os.environ[provider["env"]].strip()
        for model in (models or provider["models"]):
            for attempt in range(retries):
                body = json.dumps({
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }).encode("utf-8")

                req = urllib.request.Request(
                    provider["url"], data=body, method="POST",
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        # Not cosmetic. urllib defaults to
                        # "Python-urllib/3.x", which Groq's Cloudflare front
                        # blocks with error 1010 -- a browser-integrity ban,
                        # not a rate limit. That single missing header was 63
                        # of 87 rejections in the first full run, and it looks
                        # exactly like a quality problem in the reject log.
                        "User-Agent": "taproot/1.0 (+https://github.com/Sham-puttane/Taproot-Nerdy-AI-Hackathon)",
                        # OpenRouter asks for these; they also make the traffic
                        # attributable if we need to debug a rate limit.
                        "HTTP-Referer": "https://github.com/Sham-puttane/Taproot-Nerdy-AI-Hackathon",
                        "X-Title": "Taproot",
                    },
                )
                t0 = time.time()
                try:
                    with urllib.request.urlopen(req, timeout=timeout) as r:
                        payload = json.loads(r.read().decode("utf-8"))
                    choices = payload.get("choices") or []
                    if not choices:
                        raise RuntimeError(f"no choices: {str(payload)[:200]}")
                    text = choices[0]["message"]["content"] or ""
                    if not text.strip():
                        raise RuntimeError("empty completion")
                    return Reply(text.strip(),
                                 f"{provider['name']}/{model}",
                                 time.time() - t0)
                except urllib.error.HTTPError as e:
                    detail = e.read().decode("utf-8", "replace")[:300]
                    last = RuntimeError(
                        f"{provider['name']}/{model} HTTP {e.code}: {detail}")
                    # 429 on a free tier means wait, not give up on the model
                    if e.code == 429 and attempt + 1 < retries:
                        time.sleep(3 * (attempt + 1))
                        continue
                    break
                except Exception as e:                  # noqa: BLE001
                    last = e
                    if attempt + 1 < retries:
                        time.sleep(2)
                        continue
                    break

    raise RuntimeError(f"every provider and model failed; last error: {last}")


def _extract(text: str) -> object | None:
    """Dig the first decodable JSON value out of a reply."""
    if "```" in text:
        chunks = text.split("```")
        for c in chunks:
            c = c.strip()
            if c.startswith("json"):
                c = c[4:].strip()
            if c.startswith("{") or c.startswith("["):
                text = c
                break

    # Models reason out loud before answering, and sometimes emit a second
    # object after the first. raw_decode reads ONE value and stops, so trailing
    # prose and stray objects stop being fatal -- three of the first five real
    # calls failed on exactly this, none of them because the maths was bad.
    decoder = json.JSONDecoder()
    for i, ch in enumerate(text):
        if ch not in "{[":
            continue
        try:
            value, _ = decoder.raw_decode(text[i:])
        except ValueError:
            continue
        if not value:
            continue
        # A model asked for one object sometimes returns a list holding it.
        if isinstance(value, list):
            for v in value:
                if isinstance(v, dict) and v:
                    return v
            continue
        if isinstance(value, dict):
            return value
    return None


def ask_json(system: str, user: str, *, json_retries: int = 2, **kw) -> dict:
    """Same, but insists on a parseable JSON OBJECT.

    Reasoning models narrate before answering and can spend the whole token
    budget doing it, so a failure to parse is retried with a blunter
    instruction and more room rather than treated as a dead end. This is the
    cheap half of the propose/verify loop: presentation failures are retried,
    and only mathematical failures are rejected outright by the verifier.
    """
    kw.setdefault("max_tokens", 3000)
    attempt_user = user
    last_text = ""

    for attempt in range(json_retries + 1):
        reply = ask(system, attempt_user, **kw)
        last_text = reply.text
        found = _extract(reply.text)
        if found is not None:
            return found
        attempt_user = (
            user
            + "\n\nYour previous reply contained no JSON object. "
            "Reply with the JSON object ONLY. Start your reply with { and "
            "end it with }. Do not explain your reasoning."
        )
        kw["temperature"] = 0.1

    raise ValueError(f"no JSON object after {json_retries + 1} tries: "
                     f"{last_text[:200]}")
