"""Shared data model and helpers for the corpus pipeline.

Everything downstream (the app) consumes the JSON produced here, so the
shapes defined in this file are the contract between pipeline and app.
See docs/DATA.md for the documented schema.
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field, asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "pipeline" / "sources"
OUT = ROOT / "app" / "public" / "data"

# --------------------------------------------------------------------------
# Unicode helpers
# --------------------------------------------------------------------------

def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s or "")


_PUNCT_RE = re.compile(r"^[\s\.,;:·\-—–\(\)\[\]\"'ʼ«»‘’“”…!?†⸀⸁⸂⸃⸄⸅⸆⸇⸈⸉⸊⸋⸌⸍⸎⸏]+$")


def is_punct(form: str) -> bool:
    return bool(_PUNCT_RE.match(form))


def strip_diacritics(s: str) -> str:
    """Lowercase and remove all combining marks (used only for fuzzy matching)."""
    d = unicodedata.normalize("NFD", s.lower())
    d = "".join(c for c in d if not unicodedata.combining(c)).replace("ς", "σ")
    return d.translate(_APOSTROPHES)


_APOSTROPHES = {ord(c): None for c in "'ʼ’‘′`´"}


_LEMMA_SUFFIX = re.compile(r"(#\d+|\d+)$")


def norm_lemma(lemma: str) -> str:
    """Canonical lemma key shared by all treebanks.

    Treebanks disambiguate homographs with suffixes (εἰμί#1 in PROIEL, λύω1
    in AGDT). We drop them: the learner model tracks words, not lexicon
    entries, and the lexicon is keyed by plain headwords.
    """
    l = nfc(lemma).strip()
    l = _LEMMA_SUFFIX.sub("", l)
    # a lemma never ends in a grave accent; some files keep the in-text form
    return l.translate(_GRAVE_TO_ACUTE)


_GRAVE_TO_ACUTE = {ord(a): b for a, b in zip("ὰὲὴὶὸὺὼἂἃἒἓἢἣἲἳὂὃὒὓὢὣᾂᾃᾒᾓᾢᾣ", "άέήίόύώἄἅἔἕἤἥἴἵὄὅὔὕὤὥᾄᾅᾔᾕᾤᾥ")}


# --------------------------------------------------------------------------
# AGDT postag (9 positions). This is the morphology format the app speaks;
# PROIEL tags are converted into it (see proiel.py).
#   1 pos  2 person  3 number  4 tense  5 mood  6 voice  7 gender  8 case  9 degree
# --------------------------------------------------------------------------

POS = {
    "n": "noun", "v": "verb", "a": "adjective", "d": "adverb", "l": "article",
    "g": "particle", "c": "conjunction", "r": "preposition", "p": "pronoun",
    "m": "numeral", "i": "interjection", "e": "exclamation", "u": "punctuation",
    "x": "irregular", "t": "participle",
}
PERSON = {"1": "1st", "2": "2nd", "3": "3rd"}
NUMBER = {"s": "singular", "p": "plural", "d": "dual"}
TENSE = {
    "p": "present", "i": "imperfect", "r": "perfect", "l": "pluperfect",
    "t": "future perfect", "f": "future", "a": "aorist",
}
MOOD = {
    "i": "indicative", "s": "subjunctive", "o": "optative", "n": "infinitive",
    "m": "imperative", "p": "participle", "d": "gerund", "g": "gerundive",
}
VOICE = {"a": "active", "p": "passive", "m": "middle", "e": "middle/passive"}
GENDER = {"m": "masculine", "f": "feminine", "n": "neuter"}
CASE = {"n": "nominative", "g": "genitive", "d": "dative", "a": "accusative", "v": "vocative", "l": "locative"}
DEGREE = {"c": "comparative", "s": "superlative"}


def pad_postag(p: str) -> str:
    p = (p or "").strip()
    if len(p) < 9:
        p = p + "-" * (9 - len(p))
    return p[:9]


# --------------------------------------------------------------------------
# Output model
# --------------------------------------------------------------------------

@dataclass
class Token:
    f: str              # surface form (NFC)
    l: str              # normalised lemma
    p: str              # 9-char AGDT postag
    h: int              # index of head token within the sentence, -1 = root
    r: str              # dependency relation (scheme named on the text)
    g: str | None = None  # short gloss (contextual if the treebank has one)

    def to_json(self):
        d = {"f": self.f, "l": self.l, "p": self.p, "h": self.h, "r": self.r}
        if self.g:
            d["g"] = self.g
        return d


@dataclass
class Sentence:
    id: str
    ref: str                     # citation inside the work, e.g. "1.1.3" or "2a"
    tokens: list[Token]
    speaker: str | None = None

    def to_json(self):
        d = {"id": self.id, "ref": self.ref, "t": [t.to_json() for t in self.tokens]}
        if self.speaker:
            d["sp"] = self.speaker
        return d


@dataclass
class Passage:
    id: str
    title: str
    ref: str
    sentences: list[Sentence] = field(default_factory=list)
    # translation per citation ref covered by this passage: ref -> text
    translations: dict[str, str] = field(default_factory=dict)

    def to_json(self):
        d = {"id": self.id, "title": self.title, "ref": self.ref,
             "s": [s.to_json() for s in self.sentences]}
        if self.translations:
            d["tr"] = self.translations
        return d


@dataclass
class TextDoc:
    id: str
    title: str
    author: str
    stage: int
    dialect: str
    description: str
    scheme: str                  # "agdt" or "proiel" (relation label set)
    analysis: str                # "manual" or "auto"
    source: dict
    translation: dict | None
    passages: list[Passage] = field(default_factory=list)
    optional: bool = False

    def to_json(self):
        return {
            "id": self.id, "title": self.title, "author": self.author,
            "stage": self.stage, "dialect": self.dialect,
            "description": self.description, "scheme": self.scheme,
            "analysis": self.analysis, "source": self.source,
            "translation": self.translation, "optional": self.optional,
            "passages": [p.to_json() for p in self.passages],
        }

    def tokens(self):
        for p in self.passages:
            for s in p.sentences:
                for t in s.tokens:
                    yield t


def write_json(path: Path, data) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    s = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    path.write_text(s, encoding="utf-8")
    return len(s.encode("utf-8"))


def repoint_heads(words: list[dict]) -> list[Token]:
    """Build Token objects from raw word dicts, dropping artificial (elliptic)
    nodes and re-pointing their dependants to the nearest real ancestor.

    Each raw dict has: id (str), form, lemma, postag, head (str id), relation,
    gloss (optional), artificial (bool).
    """
    by_id = {w["id"]: w for w in words}
    real = [w for w in words if not w["artificial"]]
    index = {w["id"]: i for i, w in enumerate(real)}

    def resolve(head_id: str, depth=0) -> int:
        if depth > 50 or not head_id or head_id == "0":
            return -1
        w = by_id.get(head_id)
        if w is None:
            return -1
        if w["artificial"]:
            return resolve(w["head"], depth + 1)
        return index[w["id"]]

    out = []
    for w in real:
        out.append(Token(
            f=nfc(w["form"]), l=norm_lemma(w["lemma"]) or nfc(w["form"]),
            p=pad_postag(w["postag"]), h=resolve(w["head"]),
            r=w["relation"] or "", g=(w.get("gloss") or None),
        ))
    return out
