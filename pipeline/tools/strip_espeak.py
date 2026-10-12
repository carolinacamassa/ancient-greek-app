"""Rebuild the Emscripten file package of espeak-ng with only the files the
Ancient Greek voice needs, and patch the loader's file table accordingly."""
import re, sys, json
from pathlib import Path
import sys
src = Path(sys.argv[1] if len(sys.argv) > 1 else "node_modules/@echogarden/espeak-ng-emscripten")
js = (src / "espeak-ng.js").read_text(encoding="utf-8")
data = (src / "espeak-ng.data").read_bytes()
m = re.search(r'loadPackage\(\{files:\[(.*?)\],remote_package_size:(\d+)\}\)', js, re.S)
assert m, "file table not found"
entries = re.findall(r'\{filename:"([^"]+)",start:(\d+),end:(\d+)(?:,audio:\d+)?\}', m.group(1))
print(len(entries), "files in package; size", int(m.group(2)))
KEEP = {"phondata", "phonindex", "phontab", "intonations", "grc_dict", "el_dict", "en_dict"}
KEEP_PATHS = {"/usr/share/espeak-ng-data/lang/grk/grc", "/usr/share/espeak-ng-data/lang/grk/el"}
keep = [(f, int(s), int(e)) for f, s, e in entries if f.split("/")[-1] in KEEP or f in KEEP_PATHS]
for f, s, e in keep: print(f"  {f} {(e-s)//1024} KB")
out = bytearray(); table = []
for f, s, e in keep:
    table.append(f'{{filename:"{f}",start:{len(out)},end:{len(out)+(e-s)}}}')
    out += data[s:e]
new_meta = "loadPackage({files:[" + ",".join(table) + f"],remote_package_size:{len(out)}}})"
js2 = js[:m.start()] + new_meta + js[m.end():]
Path("dist").mkdir(exist_ok=True)
(Path("dist") / "espeak-ng.js").write_text(js2, encoding="utf-8")
(Path("dist") / "espeak-ng.data").write_bytes(out)
print("stripped package:", len(out)//1024, "KB; js", len(js2.encode())//1024, "KB")
