"""Download every source the build needs into pipeline/sources/.

All sources are public and openly licensed; see docs/SOURCES.md.
Re-running skips files that are already present.
"""
from __future__ import annotations

import sys
import urllib.parse
import urllib.request
from pathlib import Path

from common import SOURCES

RAW = "https://raw.githubusercontent.com"
PERSEUS_TB = f"{RAW}/PerseusDL/treebank_data/master/v2.1/Greek/texts"
GORMAN = f"{RAW}/vgorman1/Greek-Dependency-Trees/master/xml%20versions"
GLAUX = f"{RAW}/alekkeersmaekers/glaux/main/xml"
GREEKLIT = f"{RAW}/PerseusDL/canonical-greekLit/master/data"

FILES: list[tuple[str, str]] = [
    # --- treebanks -------------------------------------------------------
    (f"{PERSEUS_TB}/tlg0096.tlg002.opp-grc2.1-53.tb.xml", "perseus/aesop.xml"),
    (f"{PERSEUS_TB}/tlg0059.tlg001.perseus-grc1.tb.xml", "perseus/euthyphro.xml"),
    (f"{PERSEUS_TB}/tlg0007.tlg004.perseus-grc1.tb.xml", "perseus/plutarch-lycurgus.xml"),
    (f"{PERSEUS_TB}/tlg0007.tlg015.perseus-grc1.tb.xml", "perseus/plutarch-alcibiades.xml"),
    (f"{GORMAN}/Xen_Anab_book_1.1-5.xml", "gorman/anabasis-1a.xml"),
    (f"{GORMAN}/Xen_Anab_book_1.6-9.xml", "gorman/anabasis-1b.xml"),
    (f"{GLAUX}/0062-068.xml", "glaux/lucian-dialogi-deorum.xml"),
    (f"{GLAUX}/0062-066.xml", "glaux/lucian-dialogi-mortuorum.xml"),
    (f"{RAW}/proiel/proiel-treebank/master/greek-nt.xml", "proiel/greek-nt.xml"),
    # --- Greek editions used for alignment --------------------------------
    (f"{GREEKLIT}/tlg0059/tlg001/tlg0059.tlg001.perseus-grc1.xml", "greek/euthyphro.xml"),
    # --- translations -------------------------------------------------------
    (f"{GREEKLIT}/tlg0032/tlg006/tlg0032.tlg006.perseus-eng2.xml", "translations/anabasis-brownson.xml"),
    (f"{GREEKLIT}/tlg0059/tlg001/tlg0059.tlg001.perseus-eng2.xml", "translations/euthyphro-fowler.xml"),
    (f"{GREEKLIT}/tlg0007/tlg004/tlg0007.tlg004.perseus-eng2.xml", "translations/plutarch-lycurgus-perrin.xml"),
    (f"{GREEKLIT}/tlg0007/tlg015/tlg0007.tlg015.perseus-eng2.xml", "translations/plutarch-alcibiades-perrin.xml"),
    (f"{GREEKLIT}/tlg0062/tlg068/tlg0062.tlg068.perseus-eng4.xml", "translations/lucian-dialogi-deorum-fowler.xml"),
    (f"{GREEKLIT}/tlg0062/tlg066/tlg0062.tlg066.perseus-eng4.xml", "translations/lucian-dialogi-mortuorum-fowler.xml"),
    (f"{RAW}/thiagobodruk/bible/master/json/en_kjv.json", "translations/kjv.json"),
    # --- lexicon --------------------------------------------------------------
    (f"{RAW}/helmadik/shortdefs/master/shortdefsGreekEnglishLogeion", "lexicon/shortdefsGreekEnglishLogeion"),
]


def fetch(url: str, dest: Path, force: bool = False) -> None:
    if dest.exists() and not force:
        print(f"  have   {dest.relative_to(SOURCES)}")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  fetch  {dest.relative_to(SOURCES)}  <- {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "ancient-greek-app-pipeline"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        while True:
            chunk = r.read(1 << 16)
            if not chunk:
                break
            f.write(chunk)


def main(argv: list[str]) -> int:
    force = "--force" in argv
    for url, rel in FILES:
        fetch(url, SOURCES / rel, force)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
