eSpeak NG (GPL-3.0, see COPYING.txt), compiled to WebAssembly by the Echogarden project
(https://github.com/echogarden-project/espeak-ng-emscripten, package @echogarden/espeak-ng-emscripten 0.3.5).

espeak-ng.data is the original file package reduced to what the Ancient Greek ("grc")
and Modern Greek ("el") voices need (phondata, phonindex, phontab, intonations, the grc, el and en
dictionaries and voice files); the file table inside espeak-ng.js was patched to match.
The script that does this is pipeline/tools/strip_espeak.py.
