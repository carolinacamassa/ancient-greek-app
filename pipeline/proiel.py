"""Parser for the PROIEL treebank (Greek New Testament), converting PROIEL
morphology into the AGDT 9-position postag used everywhere else in the app.

PROIEL morphology string (10 positions):
  person number tense mood voice gender case degree strength inflection
PROIEL part-of-speech is a 2-letter code; see POS_MAP.
Relations keep PROIEL's own labels (the app has a label table per scheme).
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

from common import nfc

POS_MAP = {
    "A-": "a", "Df": "d", "S-": "l", "Ma": "m", "Mo": "m", "Nb": "n", "Ne": "n",
    "C-": "c", "G-": "c", "Pd": "p", "Px": "p", "Pi": "p", "Pp": "p", "Pk": "p",
    "Ps": "p", "Pt": "p", "Pr": "p", "Pc": "p", "Py": "p", "R-": "r", "I-": "i",
    "Du": "d", "Dq": "d", "N-": "g", "F-": "x", "X-": "x", "V-": "v",
}
TENSE_MAP = {"p": "p", "i": "i", "r": "r", "s": "r", "a": "a", "u": "a", "l": "l", "f": "f", "t": "t"}
MOOD_MAP = {"i": "i", "s": "s", "m": "m", "o": "o", "n": "n", "p": "p", "d": "d", "g": "g"}
VOICE_MAP = {"a": "a", "m": "m", "p": "p", "e": "e"}
GENDER_MAP = {"m": "m", "f": "f", "n": "n", "p": "-", "o": "-", "q": "-", "r": "-"}
CASE_MAP = {"n": "n", "a": "a", "g": "g", "d": "d", "v": "v", "l": "l", "o": "-", "c": "-", "e": "-", "b": "-", "i": "-", "x": "-"}
DEGREE_MAP = {"p": "-", "c": "c", "s": "s"}


def convert_postag(pos: str, morph: str) -> str:
    m = (morph or "").ljust(10, "-")
    p = POS_MAP.get(pos, "x")
    person = m[0] if m[0] in "123" else "-"
    number = m[1] if m[1] in "spd" else "-"
    tense = TENSE_MAP.get(m[2], "-")
    mood = MOOD_MAP.get(m[3], "-")
    voice = VOICE_MAP.get(m[4], "-")
    gender = GENDER_MAP.get(m[5], "-")
    case = CASE_MAP.get(m[6], "-")
    degree = DEGREE_MAP.get(m[7], "-")
    return p + person + number + tense + mood + voice + gender + case + degree


def parse_book(path: Path, book: str) -> list[dict]:
    """Return raw sentences for one book (e.g. "JOHN"), in the same shape as
    agdt.parse. ref = "chapter.verse" of the sentence's first token."""
    out = []
    # iterparse to avoid holding the whole 29 MB tree
    for _, div in ET.iterparse(path, events=("end",)):
        if div.tag != "div":
            continue
        title = div.findtext("title") or ""
        if not title.upper().startswith(book.title() + " ") and not title.upper().startswith(book + " "):
            div.clear()
            continue
        for s in div.findall("sentence"):
            words = []
            ref = None
            for t in s.findall("token"):
                form = nfc(t.get("form") or "")
                cit = t.get("citation-part") or ""
                if ref is None and cit:
                    ref = cit.split(" ", 1)[-1]  # "JOHN 1.1" -> "1.1"
                empty = t.get("empty-token-sort")
                if not form and not empty:
                    continue
                words.append({
                    "id": t.get("id"),
                    "form": form,
                    "lemma": nfc(t.get("lemma") or ""),
                    "postag": convert_postag(t.get("part-of-speech") or "", t.get("morphology") or ""),
                    "head": t.get("head-id") or "0",
                    "relation": t.get("relation") or "",
                    "gloss": None,
                    "artificial": bool(empty) or not form,
                })
                # PROIEL keeps punctuation out of the token list; restore it
                # from presentation-after so the reader shows the real text.
                after = (t.get("presentation-after") or "").strip()
                for ch in after:
                    if ch in ",.;·:!?":
                        words.append({
                            "id": f"{t.get('id')}p{ch}", "form": ch, "lemma": ch,
                            "postag": "u--------", "head": "0",
                            "relation": "AuxK" if ch in ".;·:" else "AuxX",
                            "gloss": None, "artificial": False,
                        })
            if words:
                out.append({"id": s.get("id"), "ref": ref or "", "speaker": None, "words": words})
        div.clear()
    return out
