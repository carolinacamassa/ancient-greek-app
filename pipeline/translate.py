"""Generate sentence-by-sentence translations with Claude for texts that have
no openly licensed aligned translation (currently Aesop).

Usage:
    export ANTHROPIC_API_KEY=...        # or `ant auth login`
    pip install anthropic
    python3 pipeline/translate.py aesop  [--limit N] [--lang en|it]

Writes pipeline/translations/<text>.<lang>.json ({sentence_id: translation});
build.py merges that file into the text's passages on the next build, keyed
by sentence ref, so each sentence gets its own translation rather than a
section-level one. Re-running only translates sentences not yet in the file.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common import OUT, ROOT

TRANSLATIONS = ROOT / "pipeline" / "translations"
MODEL = "claude-opus-5-5"

SYSTEM = (
    "You translate Ancient Greek for a learner who reads the original with glosses and checks a "
    "translation afterwards. Translate each numbered sentence on its own line, keeping the sentence "
    "boundaries exactly as given, in plain {lang}. Stay close to the Greek word order and structure "
    "where {lang} allows it, so the learner can map clauses back onto the original; do not paraphrase "
    "or explain. Output only the numbered translations."
)
LANG = {"en": "English", "it": "Italian"}


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("text")
    ap.add_argument("--lang", default="en", choices=list(LANG))
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--batch", type=int, default=12, help="sentences per request")
    args = ap.parse_args(argv)

    try:
        import anthropic
    except ImportError:
        print("pip install anthropic", file=sys.stderr)
        return 1

    doc = json.loads((OUT / "texts" / f"{args.text}.json").read_text(encoding="utf-8"))
    out_path = TRANSLATIONS / f"{args.text}.{args.lang}.json"
    done: dict[str, str] = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}

    todo = []
    for p in doc["passages"]:
        for s in p["s"]:
            if s["id"] not in done:
                todo.append((p, s))
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(done)} done, {len(todo)} to translate")

    client = anthropic.Anthropic()
    system = SYSTEM.format(lang=LANG[args.lang])
    for i in range(0, len(todo), args.batch):
        batch = todo[i : i + args.batch]
        lines = []
        for n, (p, s) in enumerate(batch, 1):
            greek = " ".join(t["f"] for t in s["t"])
            lines.append(f"{n}. {greek}")
        context = f"From {doc['author']}, {doc['title']}, {batch[0][0]['title']}."
        response = client.beta.messages.create(
            model=MODEL,
            max_tokens=4000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=system,
            messages=[{"role": "user", "content": context + "\n\n" + "\n".join(lines)}],
        )
        if response.stop_reason == "refusal":
            print("refused; skipping batch", file=sys.stderr)
            continue
        text = "".join(b.text for b in response.content if b.type == "text")
        got: dict[int, str] = {}
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            num, _, rest = line.partition(".")
            if num.isdigit():
                got[int(num)] = rest.strip()
        for n, (p, s) in enumerate(batch, 1):
            if n in got:
                done[s["id"]] = got[n]
        TRANSLATIONS.mkdir(exist_ok=True)
        out_path.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  {min(i + args.batch, len(todo))}/{len(todo)}")
    print(f"wrote {out_path}; run build.py to merge")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
