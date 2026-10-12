"""Ancient Greek spelling -> phoneme string for the read-aloud voice.

The voice is Piper's German model, which learned exactly the symbols eSpeak
produces for German, so the output here is written in that inventory and
with eSpeak's conventions (stress mark immediately before the vowel, short
and long vowels as German has them: ɪ ʏ ɔ ɛ a / iː yː oː ɛː ɑː uː eː).

Pronunciation: the school pronunciation of Italian and German classrooms.
  η ɛː, ω oː, ει eː, ου uː, υ ʏ/yː, θ t, φ f, χ ch (x/ç), ζ dz, rough
  breathing h, accent as stress. (Aspirated tʰ pʰ kʰ, which the voice cannot
  say, are deliberately not attempted.)

    >>> to_ipa("ἄνθρωπος")
    'ˈantroːpɔs'
"""
from __future__ import annotations

import re
import unicodedata

SMOOTH, ROUGH = "̓", "̔"
ACUTE, GRAVE, CIRC = "́", "̀", "͂"
SUB, DIAER, MACRON, BREVE = "ͅ", "̈", "̄", "̆"
MARKS = {SMOOTH, ROUGH, ACUTE, GRAVE, CIRC, SUB, DIAER, MACRON, BREVE}
ACCENTS = {ACUTE, GRAVE, CIRC}
VOWELS = set("αεηιουω")
SHORT = {"α": "a", "ε": "ɛ", "η": "ɛː", "ι": "ɪ", "ο": "ɔ", "υ": "ʏ", "ω": "oː"}
LONG = {"α": "ɑː", "ε": "ɛ", "η": "ɛː", "ι": "iː", "ο": "ɔ", "υ": "yː", "ω": "oː"}
DIPH = {"αι": "aɪ", "ει": "eː", "οι": "ɔø", "υι": "yːɪ", "αυ": "aʊ", "ευ": "ɔø", "ηυ": "ɔø", "ου": "uː", "ωυ": "oːʊ"}
CONS = {"β": "b", "γ": "ɡ", "δ": "d", "ζ": "dz", "θ": "t", "κ": "k", "λ": "l", "μ": "m", "ν": "n",
        "ξ": "ks", "π": "p", "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "φ": "f", "χ": "x", "ψ": "ps"}
PUNCT = {".": ".", ",": ",", "·": ".", ";": "?", "!": "!", "?": "?", ":": ".", "—": ",", "–": ","}
FRONT = set("ɛɪɛːiːeːʏyːaɪɔø")   # after these (and consonants) German says ç, not x
BACK_END = {"a", "ɑ", "ɔ", "o", "u", "ʊ", "ʊ"}


def _letters(word: str):
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
    units: list[tuple[str, str]] = []   # ("C", phones) or ("V", phones) or ("S", "ˈ") or ("H", "h")
    i = 0
    while i < len(L):
        ch, marks = L[i]
        if ch in VOWELS:
            stressed = bool(marks & ACCENTS)
            rough = ROUGH in marks
            nucleus = None
            if i + 1 < len(L):
                nch, nmarks = L[i + 1]
                pair = ch + nch
                if pair in DIPH and DIAER not in nmarks and not (marks & (ACCENTS | {ROUGH, SMOOTH})):
                    nucleus = DIPH[pair]
                    stressed = stressed or bool(nmarks & ACCENTS)
                    rough = rough or ROUGH in nmarks
                    i += 1
            if nucleus is None:
                long = CIRC in marks or MACRON in marks or SUB in marks
                nucleus = (LONG if long else SHORT)[ch]
            if rough:
                units.append(("H", "h"))
            if stressed:
                units.append(("S", "ˈ"))
            units.append(("V", nucleus))
        elif ch in CONS:
            c = CONS[ch]
            if ch == "γ" and i + 1 < len(L) and L[i + 1][0] in "γκχξ":
                c = "ŋ"
            if ch == "ρ" and ROUGH in marks:
                units.append(("C", "r"))
                units.append(("H", "h"))
                i += 1
                continue
            units.append(("C", c))
        i += 1
    # context rules: χ as x after back vowels, ç otherwise; ρ as ɾ after a consonant or in a coda
    out = []
    for k, (kind, ph) in enumerate(units):
        if kind == "C" and ph == "x":
            prev = next((u[1] for u in reversed(units[:k]) if u[0] == "V"), "").rstrip("ː")
            after_cons = k > 0 and units[k - 1][0] == "C"
            if after_cons or not prev or prev[-1] not in BACK_END:
                ph = "ç"
        if kind == "C" and ph == "r":
            after_cons = k > 0 and units[k - 1][0] == "C"
            nxt = next((u[0] for u in units[k + 1:] if u[0] not in ("S", "H")), None)
            if after_cons or nxt != "V":
                ph = "ɾ"
        out.append(ph)
    return "".join(out)


# ---------------------------------------------------------------------------
# Italian scheme: the pronuncia scolastica of an Italian liceo, written in the
# symbols eSpeak uses for Italian (a e ɛ i o ɔ u; no h, no ü, no vowel length).
#   ε e, η ɛ, ο o, ω ɔ, υ i, ει ei, ου u, θ t, φ f, χ k, ζ dz, breathings silent,
#   accent as stress, double consonants kept as Italian geminates.
IT_SHORT = {"α": "a", "ε": "e", "η": "ɛ", "ι": "i", "ο": "o", "υ": "i", "ω": "ɔ"}
IT_DIPH = {"αι": "aj", "ει": "ei", "οι": "ɔi", "υι": "ui", "αυ": "aʊ", "ευ": "eʊ", "ηυ": "ɛʊ", "ου": "u", "ωυ": "ɔʊ"}
IT_CONS = {"β": "b", "γ": "ɡ", "δ": "d", "ζ": "dz", "θ": "t", "κ": "k", "λ": "l", "μ": "m", "ν": "n",
           "ξ": "ks", "π": "p", "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "φ": "f", "χ": "k", "ψ": "ps"}


def word_to_ipa_it(word: str) -> str:
    L = _letters(word)
    out: list[str] = []
    i = 0
    while i < len(L):
        ch, marks = L[i]
        if ch in VOWELS:
            stressed = bool(marks & ACCENTS)
            nucleus = None
            if i + 1 < len(L):
                nch, nmarks = L[i + 1]
                pair = ch + nch
                if pair in IT_DIPH and DIAER not in nmarks and not (marks & (ACCENTS | {ROUGH, SMOOTH})):
                    nucleus = IT_DIPH[pair]
                    stressed = stressed or bool(nmarks & ACCENTS)
                    i += 1
            if nucleus is None:
                nucleus = IT_SHORT[ch]
            if stressed:
                out.append("ˈ")
            out.append(nucleus)
        elif ch in IT_CONS:
            c = IT_CONS[ch]
            if ch == "γ" and i + 1 < len(L) and L[i + 1][0] in "γκχξ":
                c = "ŋ"
            # a doubled consonant is an Italian geminate: keep both letters
            out.append(c)
        i += 1
    return "".join(out)


SCHEMES = {"de": word_to_ipa, "it": word_to_ipa_it}


def to_ipa(text: str, scheme: str = "de") -> str:
    conv = SCHEMES[scheme]
    parts = []
    for tok in re.findall(r"[\w\u0300-\u036f\u1f00-\u1fff'ʼ’᾽]+|[.,;·!?:—–]", unicodedata.normalize("NFD", text)):
        if tok in PUNCT:
            parts.append(PUNCT[tok])
        else:
            w = conv(tok.strip("'ʼ’᾽"))
            if w:
                parts.append(w)
    s = " ".join(parts)
    return re.sub(r" ([.,?!])", r"\1", s)


if __name__ == "__main__":
    for w in ["ἄνθρωπος", "ἒ ψιλόν", "Ὑπὸ τῶν κακῶν τὰ ἀγαθὰ ἐδιώχθη ὡς ἀσθενῆ ὄντα.", "φιλοσοφία", "οὐρανός", "ῥήτωρ", "ἄγγελος", "Ζεύς", "ᾄδω", "εὐθύς", "ψυχή", "χαῖρε, ὦ Σώκρατες·", "τί φῄς;", "χρόνος", "ἔχω", "πατρός"]:
        print(w, "->", to_ipa(w), "|", to_ipa(w, "it"))
