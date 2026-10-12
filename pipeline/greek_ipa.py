"""Ancient Greek spelling -> IPA in the reconstructed (Erasmian-type) pronunciation,
as a phoneme string a neural voice can read.

The inventory is chosen to fit a German-trained voice, which is the closest
natural carrier for this pronunciation: aspirated stops (θ φ χ = tʰ pʰ kʰ,
written t h / p h / k h), long and short vowels, ü for υ, h for the rough
breathing. The pitch accent is rendered as stress on the accented syllable.

    >>> to_ipa("ἄνθρωπος")
    'ˈantʰrɔːpɔs' (with the h written as a separate symbol)
"""
from __future__ import annotations

import re
import unicodedata

SMOOTH, ROUGH = "̓", "̔"
ACUTE, GRAVE, CIRC = "́", "̀", "͂"
SUB, DIAER, MACRON, BREVE = "ͅ", "̈", "̄", "̆"
MARKS = {SMOOTH, ROUGH, ACUTE, GRAVE, CIRC, SUB, DIAER, MACRON, BREVE}
VOWELS = set("αεηιουω")
SHORT = {"α": "a", "ε": "ɛ", "η": "ɛː", "ι": "i", "ο": "ɔ", "υ": "y", "ω": "ɔː"}
LONG = {"α": "aː", "ε": "ɛ", "η": "ɛː", "ι": "iː", "ο": "ɔ", "υ": "yː", "ω": "ɔː"}
DIPH = {"αι": "aɪ", "ει": "eː", "οι": "ɔɪ", "υι": "yː", "αυ": "aʊ", "ευ": "ɛʊ", "ηυ": "ɛːʊ", "ου": "uː", "ωυ": "ɔːʊ"}
CONS = {"β": "b", "γ": "ɡ", "δ": "d", "ζ": "zd", "θ": "th", "κ": "k", "λ": "l", "μ": "m", "ν": "n",
        "ξ": "ks", "π": "p", "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "φ": "ph", "χ": "kh", "ψ": "ps"}
PUNCT = {".": ".", ",": ",", "·": ",", ";": "?", "!": "!", "?": "?", ":": ",", "—": ",", "–": ","}


def _letters(word: str):
    """Split an NFD word into (base, set_of_marks)."""
    out = []
    for ch in unicodedata.normalize("NFD", word):
        if unicodedata.combining(ch) or ch in MARKS:
            if out:
                out[-1][1].add(ch)
        else:
            out.append([ch.lower(), set()])
    return out


def word_to_ipa(word: str) -> str:
    L = _letters(word)
    syl: list[dict] = []          # {onset: str, nucleus: str, stressed: bool, h: bool}
    pending_onset = ""
    i = 0
    while i < len(L):
        ch, marks = L[i]
        if ch in VOWELS:
            nucleus = None
            stressed = bool(marks & {ACUTE, GRAVE, CIRC})
            rough = ROUGH in marks
            # diphthong: next letter ι/υ with no diaeresis and no breathing-free accent on this vowel
            if i + 1 < len(L):
                nch, nmarks = L[i + 1]
                pair = ch + nch
                if pair in DIPH and DIAER not in nmarks and not (marks & {ACUTE, GRAVE, CIRC, ROUGH, SMOOTH}):
                    nucleus = DIPH[pair]
                    stressed = stressed or bool(nmarks & {ACUTE, GRAVE, CIRC})
                    rough = rough or ROUGH in nmarks
                    i += 1
            if nucleus is None:
                long = CIRC in marks or MACRON in marks or SUB in marks
                nucleus = (LONG if long else SHORT)[ch]
            syl.append({"onset": pending_onset, "nucleus": nucleus, "stressed": stressed, "h": rough})
            pending_onset = ""
        elif ch in CONS:
            c = CONS[ch]
            if ch == "γ" and i + 1 < len(L) and L[i + 1][0] in "γκχξ":
                c = "ŋ"
            if ch == "ρ" and ROUGH in marks:
                c = "rh"
            pending_onset += c
        i += 1
    if not syl:
        return ""
    if pending_onset:  # final consonants
        syl[-1]["coda"] = pending_onset
    # a word with no accent mark (enclitics, proclitics): no stress
    out = []
    for s in syl:
        out.append(("ˈ" if s["stressed"] else "") + ("h" if s["h"] else "") + s["onset"] + s["nucleus"] + s.get("coda", ""))
    return "".join(out)


def to_ipa(text: str) -> str:
    """Whole sentence -> phoneme string with spaces between words and
    punctuation kept as Piper's pause symbols."""
    parts = []
    for tok in re.findall(r"[\ẁ-ͯἀ-῿']+|[.,;·!?:—–]", unicodedata.normalize("NFD", text)):
        if tok in PUNCT:
            parts.append(PUNCT[tok])
        else:
            w = word_to_ipa(tok.strip("'ʼ’"))
            if w:
                parts.append(w)
    s = " ".join(parts)
    return re.sub(r" ([.,?!])", r"\1", s)


if __name__ == "__main__":
    for w in ["ἄνθρωπος", "Ὑπὸ τῶν κακῶν τὰ ἀγαθὰ ἐδιώχθη ὡς ἀσθενῆ ὄντα.", "φιλοσοφία", "οὐρανός", "ῥήτωρ", "ἄγγελος", "Ζεύς", "ᾄδω", "εὐθύς", "ψυχή", "χαῖρε, ὦ Σώκρατες·", "τί φῄς;"]:
        print(w, "->", to_ipa(w))
