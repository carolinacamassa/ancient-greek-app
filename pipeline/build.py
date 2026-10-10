"""Build the app's corpus JSON from the downloaded sources.

Output (app/public/data/):
  manifest.json        texts, stats and per-text lemma frequencies
  lexicon.json         lemma -> {s: short gloss, d: longer definition}
  texts/<id>.json      one TextDoc per text (see common.py / docs/DATA.md)
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

import agdt
import proiel
import tei
import lucian
from common import (OUT, ROOT, SOURCES, Passage, Sentence, TextDoc, is_punct,
                    repoint_heads, write_json, nfc)
from lexicon import Lexicon

# --------------------------------------------------------------------------
# Text definitions
# --------------------------------------------------------------------------

LIC_AGDT = {"name": "Perseus Ancient Greek Dependency Treebank 2.1", "license": "CC BY-SA 3.0",
            "url": "https://github.com/PerseusDL/treebank_data"}
LIC_GORMAN = {"name": "Gorman, Greek Dependency Trees", "license": "CC BY-NC-SA 4.0",
              "url": "https://github.com/vgorman1/Greek-Dependency-Trees"}
LIC_GLAUX = {"name": "GLAUx corpus (automatic annotation)", "license": "CC BY-SA 4.0",
             "url": "https://github.com/alekkeersmaekers/glaux"}
LIC_PROIEL = {"name": "PROIEL Treebank (Tischendorf 1869)", "license": "CC BY-NC-SA 3.0",
              "url": "https://github.com/proiel/proiel-treebank"}


def tr_perseus(name, file, mode="div"):
    return {"name": name, "license": "CC BY-SA 3.0 (Perseus Digital Library)",
            "url": "https://github.com/PerseusDL/canonical-greekLit", "_file": file, "_mode": mode}


def passage_key_dotted(n: int):
    """Group refs like '1.2.3' by their first n components."""
    def key(ref: str) -> str:
        return ".".join(ref.split(".")[:n])
    return key


TEXTS = [
    dict(
        id="aesop", stage=1, author="Aesop", title="Fables 1–53",
        dialect="Koine (simple narrative)", analysis="manual", scheme="agdt",
        description="Chambry's text of the first fifty-three fables. Short, repetitive, "
                    "and each one finishes in a sitting. Hand-annotated, with contextual "
                    "word glosses from the Perseus annotators.",
        parser=("agdt", "perseus/aesop.xml", None), source=LIC_AGDT,
        passage_key=lambda ref: ref, passage_title=lambda k: f"Fable {k}",
        translation=None,
    ),
    dict(
        id="lucian-gods", stage=1, author="Lucian", title="Dialogues of the Gods",
        dialect="Attic (Imperial)", analysis="auto", scheme="agdt",
        description="Twenty-five short comic dialogues. Conversational Attic and the "
                    "dialogue form before Plato. Automatic parse (GLAUx), so the "
                    "structure view can be wrong in places.",
        parser=("agdt", "glaux/lucian-dialogi-deorum.xml", "div_section"), source=LIC_GLAUX,
        passage_key=passage_key_dotted(1), passage_title=lambda k: f"Dialogue {k}",
        translation=tr_perseus("Fowler & Fowler (1905); Macleod (1961) for the dialogues Fowler omitted",
                               "translations/lucian-dialogi-deorum-fowler.xml"),
        fallback_translation="translations/lucian-dialogi-deorum-macleod.xml",
    ),
    dict(
        id="lucian-dead", stage=1, author="Lucian", title="Dialogues of the Dead",
        dialect="Attic (Imperial)", analysis="auto", scheme="agdt",
        description="Thirty dialogues set in the underworld. Automatic parse (GLAUx).",
        parser=("agdt", "glaux/lucian-dialogi-mortuorum.xml", "div_section"), source=LIC_GLAUX,
        passage_key=passage_key_dotted(1), passage_title=lambda k: f"Dialogue {k}",
        translation=tr_perseus("Fowler & Fowler (1905)", "translations/lucian-dialogi-mortuorum-fowler.xml"),
    ),
    dict(
        id="xenophon-anabasis-1", stage=1, author="Xenophon", title="Anabasis, Book 1",
        dialect="Attic", analysis="manual", scheme="agdt",
        description="Plain narrative prose with syntax close to Plutarch's; the "
                    "traditional first author. Hand-annotated by Vanessa Gorman.",
        parser=("agdt", ["gorman/anabasis-1a.xml", "gorman/anabasis-1b.xml"], None), source=LIC_GORMAN,
        passage_key=passage_key_dotted(2), passage_title=lambda k: f"Book 1, chapter {k.split('.')[1]}",
        ref_fix=lambda ref, prev: ref if re.fullmatch(r"1\.\d{1,2}\.\d{1,2}", ref) else (prev or ref),
        translation=tr_perseus("Brownson (1922)", "translations/anabasis-brownson.xml"),
    ),
    dict(
        id="john", stage=1, author="John", title="Gospel of John", optional=True,
        dialect="Koine", analysis="manual", scheme="proiel",
        description="The easiest Greek prose there is, but Koine rather than Attic: "
                    "an optional detour. PROIEL treebank, translation by verse (KJV).",
        parser=("proiel", "proiel/greek-nt.xml", "JOHN"), source=LIC_PROIEL,
        passage_key=passage_key_dotted(1), passage_title=lambda k: f"Chapter {k}",
        translation={"name": "King James Version (1611, public domain)", "license": "public domain",
                     "url": "https://github.com/thiagobodruk/bible", "_kjv": "jo"},
    ),
    dict(
        id="plutarch-lycurgus", stage=2, author="Plutarch", title="Life of Lycurgus",
        dialect="Koine (literary)", analysis="manual", scheme="agdt",
        description="Sparta's lawgiver. Long periodic sentences built from participles.",
        parser=("agdt", "perseus/plutarch-lycurgus.xml", None), source=LIC_AGDT,
        passage_key=passage_key_dotted(1), passage_title=lambda k: f"Chapter {k}",
        translation=tr_perseus("Perrin (1914)", "translations/plutarch-lycurgus-perrin.xml"),
    ),
    dict(
        id="plutarch-alcibiades", stage=2, author="Plutarch", title="Life of Alcibiades",
        dialect="Koine (literary)", analysis="manual", scheme="agdt",
        description="The most novelistic of the Lives.",
        parser=("agdt", "perseus/plutarch-alcibiades.xml", None), source=LIC_AGDT,
        passage_key=passage_key_dotted(1), passage_title=lambda k: f"Chapter {k}",
        translation=tr_perseus("Perrin (1916)", "translations/plutarch-alcibiades-perrin.xml"),
    ),
    dict(
        id="plato-euthyphro", stage=3, author="Plato", title="Euthyphro",
        dialect="Attic", analysis="manual", scheme="agdt",
        description="Socrates outside the court, on what piety is. The target text: "
                    "the progress figure on the library page is computed against it.",
        parser=("agdt", "perseus/euthyphro.xml", None), source=LIC_AGDT,
        align=("greek/euthyphro.xml", "milestone"),
        passage_key=lambda ref: re.sub(r"[a-e]$", "", ref), passage_title=lambda k: f"Stephanus page {k}",
        translation=tr_perseus("Fowler (1966)", "translations/euthyphro-fowler.xml", mode="milestone"),
    ),
]


# --------------------------------------------------------------------------

def load_raw(cfg) -> list[dict]:
    kind, files, extra = cfg["parser"]
    if isinstance(files, str):
        files = [files]
    raw = []
    for f in files:
        path = SOURCES / f
        if kind == "agdt":
            raw.extend(agdt.parse(path, ref_attr=extra))
        elif kind == "proiel":
            raw.extend(proiel.parse_book(path, extra))
    if cfg.get("align"):
        gfile, mode = cfg["align"]
        stream = tei.greek_token_stream(SOURCES / gfile, mode)
        raw, matched, total = tei.align_sentences(raw, stream)
        print(f"    aligned to TEI: {matched}/{total} words matched")
    fix = cfg.get("ref_fix")
    if fix:
        prev = ""
        for s in raw:
            s["ref"] = fix(s["ref"], prev)
            prev = s["ref"]
    return raw


def load_translation(cfg, raw: list[dict]) -> dict[str, str]:
    tr = cfg.get("translation")
    if not tr:
        return {}
    if "_kjv" in tr:
        books = json.loads((SOURCES / "translations" / "kjv.json").read_text(encoding="utf-8-sig"))
        book = next(b for b in books if b["abbrev"] == tr["_kjv"])
        return {f"{c + 1}.{v + 1}": text for c, ch in enumerate(book["chapters"]) for v, text in enumerate(ch)}
    sections = tei.translation_sections(SOURCES / tr["_file"], tr.get("_mode", "div"))
    # drop units that are only a translator's signature or a stray label
    sections = {k: v for k, v in sections.items() if len(v) > 40 or re.search(r"[a-z]{3,} [a-z]{3,}", v)}
    if cfg.get("fallback_translation"):
        sections = _lucian_fallback(cfg, raw, sections)
    return sections


def _lucian_fallback(cfg, raw, sections):
    fb = tei.translation_sections(SOURCES / cfg["fallback_translation"])
    greek = {}
    for s in raw:
        if s["ref"] not in sections:
            greek.setdefault(s["ref"].split(".")[0], []).append(s)
    english = {}
    for k, v in fb.items():
        d = k.split(".")[0]
        english[d] = english.get(d, "") + "\n" + v
    mapping = lucian.match_dialogues(greek, english)
    filled = 0
    for ref in sorted({s["ref"] for s in raw}):
        d, _, sec = ref.partition(".")
        if ref in sections or d not in mapping:
            continue
        alt = f"{mapping[d]}.{sec}" if sec else mapping[d]
        if alt in fb:
            sections[ref] = fb[alt]
            filled += 1
    print(f"    dialogue mapping (Greek -> fallback translation): "
          f"{ {k: mapping[k] for k in sorted(mapping, key=int)} }")
    print(f"    filled {filled} sections from the fallback translation")
    return sections


def _expand_ref(ref: str, available: dict[str, str]) -> list[str]:
    """Treebank refs sometimes span sections: '10.1-10.2', '13.3-4', or a bare
    chapter '15'. Return the list of translation refs they cover."""
    if ref in available:
        return [ref]
    m = re.fullmatch(r"(\d+)\.(\d+)-(?:(\d+)\.)?(\d+)", ref)
    if m:
        ch, a, ch2, b = m.groups()
        ch2 = ch2 or ch
        out = []
        for c in range(int(ch), int(ch2) + 1):
            lo = int(a) if c == int(ch) else 1
            hi = int(b) if c == int(ch2) else 99
            out += [f"{c}.{s}" for s in range(lo, hi + 1) if f"{c}.{s}" in available]
        return out
    if re.fullmatch(r"\d+", ref):
        return sorted((k for k in available if k.split(".")[0] == ref and "." in k), key=_natural)
    return []


def public_translation(cfg):
    tr = cfg.get("translation")
    if not tr:
        return None
    return {k: v for k, v in tr.items() if not k.startswith("_")}


def build_text(cfg, lex: Lexicon) -> TextDoc:
    print(f"  {cfg['id']}")
    raw = load_raw(cfg)
    translations = load_translation(cfg, raw)

    doc = TextDoc(
        id=cfg["id"], title=cfg["title"], author=cfg["author"], stage=cfg["stage"],
        dialect=cfg["dialect"], description=cfg["description"], scheme=cfg["scheme"],
        analysis=cfg["analysis"], source=cfg["source"], translation=public_translation(cfg),
        optional=cfg.get("optional", False),
    )
    key_of = cfg["passage_key"]
    passages: dict[str, Passage] = {}
    order: list[str] = []
    for i, s in enumerate(raw):
        ref = s["ref"] or (order[-1] if order else "")
        k = key_of(ref)
        if k not in passages:
            passages[k] = Passage(id=f"{cfg['id']}:{k}", title=cfg["passage_title"](k), ref=k)
            order.append(k)
        tokens = repoint_heads(s["words"])
        if not tokens:
            continue
        passages[k].sentences.append(Sentence(id=f"{cfg['id']}:{s['id'] or i}", ref=ref,
                                              tokens=tokens, speaker=s.get("speaker")))
    for k in order:
        p = passages[k]
        refs = {s.ref for s in p.sentences}
        prev = None
        for r in sorted(refs, key=_natural):
            covered = _expand_ref(r, translations)
            if covered:
                p.translations[r] = "\n".join(translations[c] for c in covered)
                prev = r
            elif prev is not None and cfg.get("translation"):
                # e.g. a verse split differently by the two editions
                p.translations[r] = p.translations[prev]
    doc.passages = [passages[k] for k in order]
    _merge_sentence_translations(cfg, doc)

    n_tr = sum(len(p.translations) for p in doc.passages)
    n_refs = len({s.ref for p in doc.passages for s in p.sentences})
    print(f"    passages={len(doc.passages)} sentences={sum(len(p.sentences) for p in doc.passages)} "
          f"tokens={sum(1 for _ in doc.tokens())} translated refs={n_tr}/{n_refs}")
    return doc


def _merge_sentence_translations(cfg, doc: TextDoc):
    """Sentence-level translations produced by translate.py override the
    section-level ones: each sentence gets its own ref-keyed entry."""
    for lang in ("en", "it"):
        path = ROOT / "pipeline" / "translations" / f"{cfg['id']}.{lang}.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        n = 0
        for p in doc.passages:
            for s in p.sentences:
                if s.id in data:
                    # keyed by sentence id; the app looks up tr[sentence.id] before tr[sentence.ref]
                    p.translations[s.id] = data[s.id]
                    n += 1
        if n:
            doc.translation = {"name": "Machine translation, sentence by sentence (pipeline/translate.py)", "license": "generated", "url": "https://github.com/carolinacamassa/ancient-greek-app/blob/main/docs/TRANSLATIONS.md"}
            print(f"    merged {n} sentence translations from {path.name}")



def _natural(s: str):
    return [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", s)]


def lucian_speaker_check(doc: TextDoc):
    """Warn when a dialogue's Greek speakers do not appear among the speaker
    labels of its translation (a sign of mismatched dialogue numbering)."""
    bad = 0
    for p in doc.passages:
        greek = {lucian._stem(lucian.transliterate(s.speaker)) for s in p.sentences if s.speaker}
        english = lucian.speakers_english("\n" + "\n".join(p.translations.values()))
        if greek and english and not (greek & english):
            bad += 1
            print(f"    speaker mismatch in {p.id}: {sorted(greek)} vs {sorted(english)}")
    if bad:
        print(f"    WARNING: {bad} passages with speaker mismatch")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "texts").mkdir(exist_ok=True)
    lex = Lexicon()
    manifest_texts = []
    corpus_lemmas: Counter = Counter()
    print("building texts")
    for cfg in TEXTS:
        doc = build_text(cfg, lex)
        if doc.id.startswith("lucian"):
            lucian_speaker_check(doc)
        freq: Counter = Counter()
        for t in doc.tokens():
            if t.p[0] == "u" or is_punct(t.f):
                continue
            freq[t.l] += 1
        corpus_lemmas.update(freq)
        for lemma in freq:
            lex.lookup(lemma)
        size = write_json(OUT / "texts" / f"{doc.id}.json", doc.to_json())
        manifest_texts.append({
            "id": doc.id, "title": doc.title, "author": doc.author, "stage": doc.stage,
            "optional": doc.optional, "analysis": doc.analysis, "dialect": doc.dialect,
            "description": doc.description, "file": f"texts/{doc.id}.json", "bytes": size,
            "passages": len(doc.passages),
            "sentences": sum(len(p.sentences) for p in doc.passages),
            "tokens": sum(freq.values()), "lemmas": len(freq),
            "hasTranslation": any(p.translations for p in doc.passages),
            "freq": dict(freq.most_common()),
        })
    lex_out = {k: v for k, v in lex.used.items()}
    missing = [l for l in corpus_lemmas if l not in lex_out]
    print(f"lexicon: {len(lex_out)} entries, {len(missing)} corpus lemmas without a definition "
          f"(e.g. {missing[:8]})")
    write_json(OUT / "lexicon.json", lex_out)
    manifest = {
        "generated": __import__("datetime").date.today().isoformat(),
        "texts": manifest_texts,
        "corpusLemmas": len(corpus_lemmas),
        "corpusTokens": sum(corpus_lemmas.values()),
    }
    size = write_json(OUT / "manifest.json", manifest)
    print(f"manifest: {size/1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
