"""Generate sentence-by-sentence translations with an LLM for texts that have
no openly licensed aligned translation (currently Aesop).

Providers (stdlib only, no SDK needed):
  OpenRouter  OPENROUTER_API_KEY set   -> https://openrouter.ai/api/v1/chat/completions
  Anthropic   ANTHROPIC_API_KEY set    -> https://api.anthropic.com/v1/messages
  No key variable but a proxy that attaches it (a cloud environment "network
  secret"): pass --provider openrouter|anthropic and no header is sent.

Usage:
    python3 pipeline/translate.py aesop [--lang en|it] [--limit N] [--model ID] [--list-models]

Writes pipeline/translations/<text>.<lang>.json ({sentence_id: translation});
build.py merges that file into the text's passages on the next build, keyed
by sentence id, so each sentence gets its own translation rather than a
section-level one. Re-running only translates sentences not yet in the file.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from common import OUT, ROOT

TRANSLATIONS = ROOT / "pipeline" / "translations"
DEFAULT_MODEL = {"openrouter": "anthropic/claude-sonnet-4.5", "anthropic": "claude-opus-5-5"}

SYSTEM = (
    "You translate Ancient Greek for a learner who reads the original with glosses and checks a "
    "translation afterwards. Translate each numbered sentence on its own line, keeping the sentence "
    "boundaries exactly as given, in plain {lang}. Stay close to the Greek word order and structure "
    "where {lang} allows it, so the learner can map clauses back onto the original; do not paraphrase, "
    "explain or add notes. Output only the numbered translations, one per line."
)
LANG = {"en": "English", "it": "Italian"}


def provider(forced: str | None) -> tuple[str, str]:
    """Return (provider, key). An empty key means "send no Authorization
    header": a proxy in front of the session attaches the credential itself
    (Claude Code cloud environments call this a network secret)."""
    for env, name in (("OPENROUTER_API_KEY", "openrouter"), ("ANTHROPIC_API_KEY", "anthropic")):
        key = os.environ.get(env)
        if key and forced in (None, name):
            return name, key
    for env, key in os.environ.items():
        if "OPENROUTER" in env.upper() and key.startswith("sk-") and forced in (None, "openrouter"):
            return "openrouter", key
    if forced:
        return forced, ""
    sys.exit("set OPENROUTER_API_KEY or ANTHROPIC_API_KEY, or pass --provider openrouter "
             "when a proxy attaches the key for you")


def post(url: str, headers: dict, body: dict, retries: int = 4) -> dict:
    data = json.dumps(body).encode("utf-8")
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **headers})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:300]
            if e.code in (408, 409, 429, 500, 502, 503, 529) and attempt < retries - 1:
                wait = 2 ** (attempt + 1)
                print(f"  HTTP {e.code}, retrying in {wait}s: {msg}", file=sys.stderr)
                time.sleep(wait)
                continue
            sys.exit(f"HTTP {e.code}: {msg}")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < retries - 1:
                time.sleep(2 ** (attempt + 1))
                continue
            sys.exit(f"network error: {e}")
    raise RuntimeError("unreachable")


def complete(prov: str, key: str, model: str, system: str, user: str) -> str:
    if prov == "openrouter":
        r = post("https://openrouter.ai/api/v1/chat/completions",
                 {**auth_header(prov, key), "HTTP-Referer": "https://github.com/carolinacamassa/ancient-greek-app",
                  "X-Title": "Greek Reader pipeline"},
                 {"model": model, "max_tokens": 4000, "temperature": 0.2,
                  "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        choice = r["choices"][0]
        return choice["message"]["content"] or ""
    r = post("https://api.anthropic.com/v1/messages",
             {**auth_header(prov, key), "anthropic-version": "2023-06-01"},
             {"model": model, "max_tokens": 4000, "system": system,
              "messages": [{"role": "user", "content": user}]})
    if r.get("stop_reason") == "refusal":
        return ""
    return "".join(b.get("text", "") for b in r["content"] if b.get("type") == "text")


def auth_header(prov: str, key: str) -> dict:
    if not key:
        return {}
    return {"Authorization": f"Bearer {key}"} if prov == "openrouter" else {"x-api-key": key}


def list_models(key: str) -> None:
    req = urllib.request.Request("https://openrouter.ai/api/v1/models", headers=auth_header("openrouter", key))
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)["data"]
    for m in sorted(data, key=lambda m: m["id"]):
        if any(k in m["id"] for k in ("anthropic/", "openai/gpt-5", "google/gemini", "deepseek/", "qwen/qwen3", "x-ai/grok")):
            p = m.get("pricing", {})
            print(f"{m['id']:50s} in ${float(p.get('prompt', 0))*1e6:7.2f}/M  out ${float(p.get('completion', 0))*1e6:7.2f}/M")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("text")
    ap.add_argument("--lang", default="en", choices=list(LANG))
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--batch", type=int, default=12, help="sentences per request")
    ap.add_argument("--model", default=None)
    ap.add_argument("--list-models", action="store_true")
    ap.add_argument("--provider", choices=["openrouter", "anthropic"], default=None,
                    help="needed only when no key variable is set and a proxy attaches the credential")
    args = ap.parse_args(argv)

    prov, key = provider(args.provider)
    if args.list_models:
        list_models(key)
        return 0
    model = args.model or DEFAULT_MODEL[prov]
    print(f"provider {prov}, model {model}")

    doc = json.loads((OUT / "texts" / f"{args.text}.json").read_text(encoding="utf-8"))
    out_path = TRANSLATIONS / f"{args.text}.{args.lang}.json"
    done: dict[str, str] = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}

    todo = [(p, s) for p in doc["passages"] for s in p["s"] if s["id"] not in done]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(done)} done, {len(todo)} to translate")

    system = SYSTEM.format(lang=LANG[args.lang])
    for i in range(0, len(todo), args.batch):
        batch = todo[i : i + args.batch]
        lines = [f"{n}. " + " ".join(t["f"] for t in s["t"]) for n, (p, s) in enumerate(batch, 1)]
        context = f"From {doc['author']}, {doc['title']}, {batch[0][0]['title']}."
        text = complete(prov, key, model, system, context + "\n\n" + "\n".join(lines))
        got: dict[int, str] = {}
        for line in text.splitlines():
            line = line.strip().lstrip("*").strip()
            num, _, rest = line.partition(".")
            if num.strip().isdigit() and rest.strip():
                got[int(num)] = rest.strip()
        missing = [n for n in range(1, len(batch) + 1) if n not in got]
        if missing:
            print(f"  batch at {i}: no translation for items {missing}", file=sys.stderr)
        for n, (p, s) in enumerate(batch, 1):
            if n in got:
                done[s["id"]] = got[n]
        TRANSLATIONS.mkdir(exist_ok=True)
        out_path.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  {min(i + args.batch, len(todo))}/{len(todo)}")
    print(f"wrote {out_path} ({len(done)} sentences); run build.py to merge")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
