# Translations

Seven of the eight texts have an openly licensed English translation aligned to the citation scheme the treebank uses (section, chapter section, Stephanus section, verse). The reader shows the translation of the section a sentence belongs to, which usually covers two to five sentences.

Aesop has none: the public-domain English Aesops (Townsend, Jacobs) follow different collections and numbering from Chambry's, and the Chambry translation is in copyright.

## Generating sentence-level translations

`pipeline/translate.py` asks Claude (`claude-opus-5-5`) for a translation of each sentence of a text, in batches, and saves them to `pipeline/translations/<text>.<lang>.json` keyed by sentence id. The next `build.py` merges them into the text's passages under `tr[sentence.id]`, which the app prefers over the section-level `tr[sentence.ref]`.

```sh
pip install anthropic
export ANTHROPIC_API_KEY=…         # or `ant auth login`
python3 pipeline/translate.py aesop            # English
python3 pipeline/translate.py aesop --lang it  # Italian
python3 pipeline/build.py
```

The script is resumable (it skips sentences already in the file) and takes `--limit N` for a trial run. The prompt asks for a translation that keeps the Greek clause order where the target language allows it, so the learner can map the two. Server-side refusal fallback (`fallbacks: "default"`) is on, so a declined batch is retried on another model inside the same call.

The same script works for any text, which is how to get sentence-level translations for the others, or Italian for all of them. The generated file is marked as generated in the text's `translation` field.

The file has not been generated in this repository: it needs an API key.
