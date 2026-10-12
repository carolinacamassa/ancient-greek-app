# Sources and licences

Everything the pipeline downloads is public and openly licensed. Nothing is redistributed under a licence more permissive than its own; the generated JSON in `app/public/data/` inherits the licence of its source text, listed in each text's `source` and `translation` fields.

## Treebanks

| Text | Source | Licence | Notes |
|---|---|---|---|
| Aesop, Fables 1–53 (Chambry) | [Perseus AGDT 2.1](https://github.com/PerseusDL/treebank_data) `tlg0096.tlg002` | CC BY-SA 3.0 | per-word English glosses by the annotators (Ivanova, Yordanova) |
| Plato, Euthyphro | Perseus AGDT 2.1 `tlg0059.tlg001` | CC BY-SA 3.0 | file has no Stephanus refs; aligned to the Perseus TEI edition by word matching (5087/5175 words matched), which also supplies the speakers |
| Plutarch, Lycurgus and Alcibiades | Perseus AGDT 2.1 `tlg0007.tlg004`, `tlg0007.tlg015` | CC BY-SA 3.0 | some sentences span sections (`10.1-10.2`); the build joins the covered translations |
| Xenophon, Anabasis 1 | [Gorman, Greek Dependency Trees](https://github.com/vgorman1/Greek-Dependency-Trees) `Xen_Anab_book_1.*` | CC BY-NC-SA 4.0 | two refs in the source are typos (`1.5.171`, `19.31`) and are attached to the previous sentence |
| Lucian, Dialogi deorum and Dialogi mortuorum | [GLAUx](https://github.com/alekkeersmaekers/glaux) `0062-068`, `0062-066` | CC BY-SA 4.0 | automatic annotation (lemmas ~99%, morphology ~97%, syntax ~80% per the GLAUx README); speakers and section numbers come with the file |
| Gospel of John | [PROIEL Treebank](https://github.com/proiel/proiel-treebank) `greek-nt.xml` (Tischendorf 1869) | CC BY-NC-SA 3.0 | PROIEL morphology and relations converted; punctuation restored from `presentation-after` |

## Lexicon

[Logeion short definitions](https://github.com/helmadik/shortdefs) (`shortdefsGreekEnglishLogeion`), based on the Perseus short definitions. Credit Perseus and Logeion. The build keeps only lemmas that occur in the corpus and shortens each definition to its first sense or two for the interlinear line.

## Translations

| Text | Translation | Where |
|---|---|---|
| Xenophon, Anabasis | Brownson (Loeb 1922) | Perseus canonical-greekLit `tlg0032.tlg006.perseus-eng2` |
| Plato, Euthyphro | Fowler (Loeb 1966 printing of the 1914 translation) | `tlg0059.tlg001.perseus-eng2`, by Stephanus section |
| Plutarch, Lycurgus / Alcibiades | Perrin (Loeb 1914, 1916) | `tlg0007.tlg004.perseus-eng2`, `tlg0007.tlg015.perseus-eng2` |
| Lucian, Dialogues of the Gods | Fowler & Fowler (Oxford 1905); Macleod (Loeb 1961, unrenewed copyright) for the seven dialogues the Fowlers omitted | `tlg0062.tlg068.perseus-eng4`, `-eng3`. Macleod renumbers the dialogues; the build maps them by speakers and proper names and prints the mapping |
| Lucian, Dialogues of the Dead | Fowler & Fowler (1905) | `tlg0062.tlg066.perseus-eng4` |
| Gospel of John | King James Version | [thiagobodruk/bible](https://github.com/thiagobodruk/bible) `en_kjv.json`, by verse; Tischendorf's 1.52 is attached to 1.51 |
| Aesop | none available | see TRANSLATIONS.md |

Perseus translations are CC BY-SA 3.0 as distributed by the Perseus Digital Library.

## Not used, and why

- GLAUx `0096-002a` (all 358 Chambry fables, automatically parsed): its source text is CC BY-NC-ND, which does not allow the derived JSON.
- GLAUx `0096-002b` (the First1KGreek Aesop, CC BY-SA, partly Pedalion-annotated): a different recension and numbering from Chambry 1–53; could be added as "more fables" later.
- Harrington's treebank of Lucian's *True Histories* (CC BY-SA, hand-annotated): a candidate for a hand-annotated Lucian text.

## Voice

Read-aloud audio is generated with [Piper](https://github.com/rhasspy/piper) (MIT) and its Italian voice `it_IT-paola-medium` (model from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices); dataset [Voice-Dataset-Italian](https://huggingface.co/datasets/paolapersico1/Voice-Dataset-Italian), licence as stated there), downloaded by `fetch.py`. The generated MP3s in `app/public/audio/` are derived from the texts above and the voice, and carry the texts' licences.
