"""Lucian-specific helpers.

The Fowler translation (1905) omits several of the Dialogues of the Gods, and
Macleod's Loeb translation (1961) renumbers them. To fill Fowler's gaps we
match each Greek dialogue to a Macleod dialogue by its speakers and by the
proper names mentioned in it, and print the mapping for review.
"""
from __future__ import annotations

import re
from collections import Counter

from common import strip_diacritics

_TR = [("th", "θ"), ("ph", "φ"), ("ch", "χ"), ("ps", "ψ"), ("ou", "ου"), ("ai", "αι"),
       ("ei", "ει"), ("oi", "οι"), ("au", "αυ"), ("eu", "ευ"),
       ("a", "α"), ("b", "β"), ("g", "γ"), ("d", "δ"), ("e", "ε"), ("z", "ζ"), ("e", "η"),
       ("i", "ι"), ("k", "κ"), ("l", "λ"), ("m", "μ"), ("n", "ν"), ("x", "ξ"), ("o", "ο"),
       ("p", "π"), ("r", "ρ"), ("s", "σ"), ("t", "τ"), ("y", "υ"), ("o", "ω"), ("h", "")]


def transliterate(greek: str) -> str:
    s = strip_diacritics(greek)
    out = s
    for lat, gr in _TR:
        if gr:
            out = out.replace(gr, lat)
    return out


def _stem(s: str, n: int = 4) -> str:
    s = s.lower().lstrip("h")  # Greek rough breathing is lost in strip_diacritics
    s = re.sub(r"(us|os|es|is|as|on|um|a|e|o)$", "", s) if len(s) > 5 else s
    s = s.replace("k", "c").replace("y", "i").replace("ae", "e").replace("oe", "e")
    return s[:n]


def names_in_greek(sentences: list[dict]) -> Counter:
    c: Counter = Counter()
    for s in sentences:
        for w in s["words"]:
            lemma = w["lemma"]
            if lemma[:1].isupper() and w["postag"][:1] in "n" and len(lemma) > 2:
                c[_stem(transliterate(lemma))] += 1
    return c


def names_in_english(text: str) -> Counter:
    c: Counter = Counter()
    for w in re.findall(r"\b[A-Z][a-z]{2,}\b", text):
        if w in {"The", "And", "But", "Yes", "Why", "What", "You", "That", "This", "Then", "Well", "Now", "Oh"}:
            continue
        c[_stem(w)] += 1
    return c


def speakers_english(text: str) -> set[str]:
    return {_stem(m) for m in re.findall(r"(?:^|\n)([A-Z][A-Za-z ]+?): ", text)}


def match_dialogues(greek_by_dialogue: dict[str, list[dict]], english_by_dialogue: dict[str, str]) -> dict[str, str]:
    """Return {greek_dialogue_number: english_dialogue_number}."""
    eng = {}
    for k, text in english_by_dialogue.items():
        eng[k] = (speakers_english(text), names_in_english(text))
    mapping: dict[str, str] = {}
    taken: set[str] = set()
    scored = []
    for g, sents in greek_by_dialogue.items():
        g_speakers = {_stem(transliterate(s["speaker"])) for s in sents if s.get("speaker")}
        g_names = names_in_greek(sents)
        for e, (e_speakers, e_names) in eng.items():
            sp_overlap = len(g_speakers & e_speakers)
            if not sp_overlap:
                continue
            common = sum(min(g_names[n], e_names[n]) for n in g_names if n in e_names)
            total = sum(g_names.values()) + sum(e_names.values()) or 1
            score = sp_overlap * 10 + 20 * common / total
            scored.append((score, g, e))
    for score, g, e in sorted(scored, reverse=True):
        if g in mapping or e in taken:
            continue
        mapping[g] = e
        taken.add(e)
    return mapping
