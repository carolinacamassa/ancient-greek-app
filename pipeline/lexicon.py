"""Logeion/Perseus short definitions -> lemma glosses."""
from __future__ import annotations

import re
from pathlib import Path

from common import nfc, strip_diacritics, SOURCES

FILE = SOURCES / "lexicon" / "shortdefsGreekEnglishLogeion"


def load() -> tuple[dict[str, str], dict[str, str]]:
    exact: dict[str, str] = {}
    loose: dict[str, str] = {}
    for line in FILE.read_text(encoding="utf-8").splitlines():
        if "\t" not in line:
            continue
        lemma, definition = line.split("\t", 1)
        lemma = nfc(lemma.strip())
        definition = definition.strip()
        if not lemma or not definition or lemma == "lemma":
            continue
        exact.setdefault(lemma, definition)
        loose.setdefault(strip_diacritics(lemma), definition)
    return exact, loose


def shorten(definition: str, limit: int = 42) -> str:
    """Interlinear glosses must be short: keep the first sense(s) up to ~limit chars."""
    d = re.sub(r"\s+", " ", definition).strip()
    d = re.sub(r"^\(.*?\)\s*", "", d)  # drop leading parenthetical
    parts = re.split(r"[;,]\s*", d)
    out = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        cand = (out + ", " + p) if out else p
        if len(cand) > limit and out:
            break
        out = cand
        if len(out) >= limit * 0.6:
            break
    if len(out) > limit + 10:
        out = out[:limit].rsplit(" ", 1)[0] + "…"
    return out


_SPECIAL = {
    "τί": "what? why?", "τοσοῦτον": "so much, so far", "ὅσον": "as much as, as far as",
    "πλησίον": "near, close to", "ταχέως": "quickly", "βράδιον": "more slowly",
    "τοῦτο": "this", "ταῦτα": "these things", "ἑαυτοῦ": "of himself, herself, itself",
    "ἀλλήλων": "of one another", "μηδείς": "no one, nothing", "οὐδείς": "no one, nothing",
}


class Lexicon:
    def __init__(self):
        self.exact, self.loose = load()
        self.used: dict[str, dict] = {}

    def lookup(self, lemma: str) -> dict | None:
        if lemma in self.used:
            return self.used[lemma]
        d = self.exact.get(lemma)
        if d is None:
            d = self.exact.get(lemma.lower())
        if d is None:
            d = self.loose.get(strip_diacritics(lemma))
        bare = strip_diacritics(lemma)
        if d is None and "-" in lemma:           # Pedalion-style compound lemmas: κατά-θοινάω
            d = self.loose.get(bare.replace("-", ""))
        if d is None and bare.endswith("ωσ"):     # adverb -> adjective
            for suf in ("οσ", "ησ", "υσ"):
                d = self.loose.get(bare[:-2] + suf)
                if d:
                    d = "(adv.) " + d
                    break
        if d is None and lemma in _SPECIAL:
            d = _SPECIAL[lemma]
        if d is None:
            if lemma[:1].isupper():
                entry = {"s": "(name)", "d": "proper name"}
            else:
                return None
        else:
            entry = {"s": shorten(d), "d": d[:240]}
        self.used[lemma] = entry
        return entry
