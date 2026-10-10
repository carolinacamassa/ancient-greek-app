"""Parser for treebanks in the Arethusa/AGDT XML shape.

Covers three sources that share the <sentence><word .../></sentence> layout
with small differences:
  * Perseus AGDT 2.1   (sentence/@subdoc, word/@gloss on Aesop, artificial nodes)
  * Gorman trees       (sentence/@subdoc, Arethusa export, insertion_id for ellipsis)
  * GLAUx              (no subdoc; word/@div_* carry the citation, word/@speaker,
                        NFD-encoded text, numeric global word ids)
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

from common import nfc


def _is_artificial(w: ET.Element) -> bool:
    if w.get("artificial"):
        return True
    if w.get("insertion_id"):
        return True
    form = w.get("form") or ""
    # AGDT marks elliptic nodes with bracketed placeholders such as "[0]"
    return bool(re.fullmatch(r"\[\d+\]", form))


def _clean_ref(ref: str) -> str:
    ref = (ref or "").strip()
    if ":" in ref:  # urn:cts:greekLit:tlg0007.tlg015.perseus-grc1:1.3 -> 1.3
        ref = ref.rsplit(":", 1)[-1]
    return ref


def parse(path: Path, ref_attr: str | None = None) -> list[dict]:
    """Return raw sentences: {id, ref, speaker, words:[{id, form, lemma, postag,
    head, relation, gloss, artificial}]}.

    ref_attr: for GLAUx files, the word attribute that carries the citation
    (e.g. "div_section" or "div_fabula"); otherwise sentence/@subdoc is used.
    """
    tree = ET.parse(path)
    out = []
    for s in tree.iter("sentence"):
        words = []
        speaker = None
        ref = None
        for w in s.findall("word"):
            if ref_attr and ref is None and w.get(ref_attr):
                ref = w.get(ref_attr)
            if speaker is None and w.get("speaker"):
                speaker = nfc(w.get("speaker"))
            words.append({
                "id": w.get("id"),
                "form": nfc(w.get("form") or ""),
                "lemma": nfc(w.get("lemma") or ""),
                "postag": w.get("postag") or "",
                "head": w.get("head") or "0",
                "relation": w.get("relation") or "",
                "gloss": nfc(w.get("gloss") or "") or None,
                "artificial": _is_artificial(w),
            })
        if not words:
            continue
        if ref is None:
            ref = _clean_ref(s.get("subdoc") or "")
        out.append({"id": s.get("id"), "ref": ref, "speaker": speaker, "words": words})
    return out
