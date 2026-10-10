# Translations

Seven of the eight texts have an openly licensed English translation aligned to the citation scheme the treebank uses (section, chapter section, Stephanus section, verse). The reader shows the translation of the section a sentence belongs to, which usually covers two to five sentences.

Aesop has none: the public-domain English Aesops (Townsend, Jacobs) follow different collections and numbering from Chambry's, and the Chambry translation is in copyright.

## Generating sentence-level translations

`pipeline/translate.py` asks an LLM (OpenRouter with `OPENROUTER_API_KEY`, or the Anthropic API with `ANTHROPIC_API_KEY`; stdlib only, no SDK) for a translation of each sentence of a text, in batches, and saves them to `pipeline/translations/<text>.<lang>.json` keyed by sentence id. The next `build.py` merges them into the text's passages under `tr[sentence.id]`, which the app prefers over the section-level `tr[sentence.ref]`.

```sh
export OPENROUTER_API_KEY=…        # or ANTHROPIC_API_KEY
python3 pipeline/translate.py aesop --list-models   # OpenRouter only: models and prices
# in a Claude Code cloud environment with the key stored as a network secret:
# python3 pipeline/translate.py aesop --provider openrouter --model anthropic/claude-opus-4.5
python3 pipeline/translate.py aesop            # English
python3 pipeline/translate.py aesop --lang it  # Italian
python3 pipeline/build.py
```

The script is resumable (it skips sentences already in the file) and takes `--limit N` for a trial run. The prompt asks for a translation that keeps the Greek clause order where the target language allows it, so the learner can map the two. `--model` picks the model; the default is a Sonnet-class Claude on OpenRouter.

The same script works for any text, which is how to get sentence-level translations for the others, or Italian for all of them. The generated file is marked as generated in the text's `translation` field.

The file has not been generated in this repository: it needs an API key.
