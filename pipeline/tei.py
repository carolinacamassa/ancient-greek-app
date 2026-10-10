"""Perseus TEI helpers: extract section-level translations and align the
Euthyphro treebank to Stephanus sections via the Greek TEI text."""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

from common import nfc, strip_diacritics, is_punct

NS = {"tei": "http://www.tei-c.org/ns/1.0"}
SKIP = {"note", "bibl", "label", "head", "pb", "lb", "del", "ref", "title", "teiHeader"}


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _ws(s: str) -> str:
    return re.sub(r"\s+", " ", s or "")


def iter_text_units(path: Path, mode: str):
    """Yield (ref, text, speaker, kind) in document order.

    mode="div": ref is the dotted path of textpart div @n values.
    mode="milestone": ref is the @n of the latest <milestone unit="section">.
    kind is "text" for ordinary text or "speaker" for a <speaker> label.
    Text inside <note>, <head>, etc. is skipped.
    """
    root = ET.parse(path).getroot()
    body = root.find(".//tei:text/tei:body", NS)
    if body is None:
        body = root.find(".//body")
    state = {"path": [], "ms": None, "speaker": None}

    def walk(el):
        tag = _local(el.tag)
        if tag in SKIP:
            return
        pushed = False
        if tag == "div" and el.get("type") == "textpart":
            state["path"].append(el.get("n") or "")
            pushed = True
        if tag == "milestone" and el.get("unit") == "section":
            state["ms"] = el.get("n")
        if tag == "said":
            state["speaker"] = (el.get("who") or "").lstrip("#")
        if tag == "speaker":
            name = _ws("".join(el.itertext())).strip()
            state["speaker"] = name
            yield (_ref(), name, name, "speaker")
        else:
            if el.text and el.text.strip():
                yield (_ref(), el.text, state["speaker"], "text")
            for child in el:
                yield from walk(child)
                if child.tail and child.tail.strip():
                    yield (_ref(), child.tail, state["speaker"], "text")
        if tag == "said":
            state["speaker"] = None
        if pushed:
            state["path"].pop()

    def _ref():
        if mode == "milestone":
            return state["ms"] or ""
        return ".".join(x for x in state["path"] if x)

    yield from walk(body)


def translation_sections(path: Path, mode: str = "div") -> dict[str, str]:
    """ref -> translated text (speaker labels rendered as "Name: ")."""
    out: dict[str, list[str]] = {}
    for ref, text, speaker, kind in iter_text_units(path, mode):
        if not ref:
            continue
        buf = out.setdefault(ref, [])
        if kind == "speaker":
            buf.append(f"\n{text}: ")
        else:
            buf.append(_ws(text))
    result = {}
    for ref, parts in out.items():
        s = "".join(parts)
        s = re.sub(r"[ \t]+", " ", s)
        s = re.sub(r" ?\n ?", "\n", s).strip()
        s = re.sub(r"\n{2,}", "\n", s)
        if s:
            result[ref] = s
    return result


def greek_token_stream(path: Path, mode: str = "milestone") -> list[tuple[str, str, str | None]]:
    """(normalised_form, ref, speaker) for each word of a Greek TEI edition."""
    toks = []
    for ref, text, speaker, kind in iter_text_units(path, mode):
        if kind != "text":
            continue
        for w in re.findall(r"[^\s\.,;:·\-—–\(\)\[\]\"'ʼ«»‘’“”…!?†]+", nfc(text)):
            toks.append((strip_diacritics(w), ref, speaker))
    return toks


def align_sentences(sentences: list[dict], stream: list[tuple[str, str, str | None]]):
    """Assign ref and speaker to raw treebank sentences by locating each
    sentence's word sequence in the TEI stream, then sort the sentences into
    text order. Treebank files are not always in text order, and a forward-
    only alignment loses sync as soon as one sentence is out of place.

    Returns (sentences_in_text_order, matched_words, total_words)."""
    from collections import defaultdict
    index: dict[tuple[str, ...], list[int]] = defaultdict(list)
    keys = [t[0] for t in stream]
    N = 3
    for k in range(len(keys) - N + 1):
        index[tuple(keys[k:k + N])].append(k)

    matched = total = 0
    cursor = 0
    positions: list[tuple[int, dict]] = []
    for s in sentences:
        words = [w for w in s["words"] if not w["artificial"] and not is_punct(w["form"])]
        wkeys = [strip_diacritics(w["form"]) for w in words]
        total += len(wkeys)
        pos = None
        # try every N-gram of the sentence until one is found; prefer the
        # candidate closest after the running cursor
        for start in range(0, max(1, len(wkeys) - N + 1)):
            gram = tuple(wkeys[start:start + N])
            if len(gram) < N:
                break
            cands = index.get(gram)
            if cands:
                after = [c for c in cands if c >= cursor - 5]
                pos = (min(after) if after else min(cands)) - start
                break
        if pos is None and wkeys:
            # short sentence: single-word search near the cursor
            for k in range(max(0, cursor - 5), min(len(keys), cursor + 60)):
                if keys[k] == wkeys[0]:
                    pos = k
                    break
        if pos is None:
            pos = cursor
        else:
            # count how many words of the sentence line up from pos
            m = sum(1 for off, wk in enumerate(wkeys) if 0 <= pos + off < len(keys) and keys[pos + off] == wk)
            matched += m
            cursor = pos + len(wkeys)
        pos = max(0, min(pos, len(stream) - 1))
        refs = [stream[pos + off][1] for off in range(len(wkeys)) if pos + off < len(stream)]
        speakers = [stream[pos + off][2] for off in range(len(wkeys)) if pos + off < len(stream)]
        s["ref"] = refs[0] if refs else stream[pos][1]
        sp = [x for x in speakers if x]
        s["speaker"] = max(set(sp), key=sp.count) if sp else None
        positions.append((pos, s))
    positions.sort(key=lambda x: x[0])
    return [s for _, s in positions], matched, total
