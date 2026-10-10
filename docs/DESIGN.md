# Design

The app is a reader for authentic Greek texts, with heavy support at the start that fades as you learn, and with grammar notes and quizzes placed where they come up in the reading rather than in a separate course. Reading the originals from day one is a reasonable way to learn Greek for someone who already has Latin, and it simplifies the app, because there is no graded or simplified content to write or generate.

## Starting texts

A few easy authentic texts are enough to get the morphology and core vocabulary in place before moving to Plutarch and Plato, and all of them are openly available and already tagged with lemmas and parses:

- Aesop's fables, which are short, repetitive and simple narrative, so you finish a whole fable in one sitting; a good fit for the first week or two.
- Lucian's short dialogues (Dialogues of the Gods, Dialogues of the Dead), which are conversational and funny, in fairly clean Attic, and get you used to the dialogue form before Plato.
- Xenophon, Anabasis book 1, plain narrative prose with syntax close to Plutarch's, and the traditional first author for that reason.
- The Gospel of John, optionally, since it is the easiest Greek prose there is, though it is Koine, so only worth it if you don't mind the detour.

After these come Plutarch's Lives and then the early Plato dialogues. The app still computes how much of each passage you already know, but it uses that figure to decide how much scaffolding to show, not to stop you from reading something.

## The reading view

With no simplified text in the path, the scaffolding carries all of the early work, in four layers:

1. **Dense interlinear glosses at first.** Early on nearly every word has a small gloss underneath, which is slow but readable, and means you are reading the original from the first day.
2. **Glosses that fade on evidence.** Each gloss disappears once the learner model thinks you know the word, and comes back if you start tapping it again, so within a few weeks the Aesop pages should be mostly bare.
3. **Phrase-level help when single words aren't enough.** Greek often can't be read word by word because of word order, particles and long chains of participles, so tapping a sentence shows its structure (the main verb, the subject, what each participle depends on). For texts with hand-annotated syntax this comes straight from the treebank; for the rest it comes from an automatic parse (and, in a later step, an LLM reading checked against it).
4. **The translation one tap away**, sentence by sentence, for checking after you have made your own attempt.

## Grammar explanations, triggered by the reading

Since the app knows the parse of every word, it knows when you have met a construction several times, and shows a short note at the point where the pattern starts to matter. After four genitive absolutes in the fables, a note explains that this is the Latin ablative absolute with the genitive doing the job. Each note is short, framed as a difference from Latin, and illustrated with the sentence you just read rather than invented examples. All the notes also sit in a reference you can browse. The notes are the one fixed piece of content: a few dozen entries covering the article, the middle voice, aorist versus imperfect, the optative, the main uses of the participle, and the most common particles.

## Quizzes from the passage you just read

Quizzes come right after a passage, are short, and are built entirely from its own sentences:

- Parse this form, choosing among the analyses that are possible for the form, which trains resolving ambiguous Greek forms from context.
- What does this participle agree with, or what does this pronoun refer to, which test the structural reading that is hardest in Greek.
- Cloze on the words you looked up, in their original sentences, coming back over the following days on a spaced schedule.
- Translate this phrase, occasionally, with an LLM grading the meaning rather than matching exact wording.

Wrong answers feed the learner model, so a missed aorist passive makes the glosses for that pattern reappear for a while.

## What this approach costs

The first two or three weeks are slow, because you rely on glosses for almost every word, and the fable-by-fable start is where people tend to give up. The app makes that stage measurable, with a count of the words you know and a figure like "you can now read X% of the Euthyphro without help" that rises as you go. That figure is computed from the tagged corpus, and it gives a reason to keep going through Aesop when Plato is the point.

## Implementation decisions

**Everything is static.** The pipeline runs once and writes JSON; the app is a static site; the learner model lives in localStorage. There is no server, no account, and the only network call the app can make is the optional translation grader, directly to the Anthropic API with a key the user pastes in.

**One morphology format.** All texts use the AGDT nine-position tag (part of speech, person, number, tense, mood, voice, gender, case, degree). PROIEL's tags are converted in the pipeline. Relation labels keep the source scheme (`agdt` or `proiel`) and the app has a label table for each.

**Lemmas are the unit of knowledge.** The learner model keys on the normalised lemma, with homograph suffixes stripped (εἰμί#1, λύω1 → εἰμί, λύω) and grave accents made acute. Coverage percentages are computed from per-text lemma frequency tables in the manifest, so the library page does not need the texts loaded.

**Passages are the unit of reading.** A fable, a Lucian dialogue, an Anabasis chapter, a Plutarch chapter, a John chapter, a Stephanus page of Plato. Each ends with a quiz.

**Translations are section-level**, keyed by the citation each sentence carries (1.1.3, 12b, 3.16), because that is what the open translations give. A sentence-level translation, when one exists (generated), overrides it.

**Construction detectors** run over the dependency tree in the browser. The same detectors drive the grammar-note triggers, the highlighted example sentences, and the agreement and reference quiz items.

**Learner model** (app/src/learner/model.ts): a strength per lemma, read-without-tap +1 per passage, tap −2, quiz ±2, known at 4; pattern reveals as postag wildcard masks with an expiry; cloze items with a short spaced schedule (1, 3, 8, 20 days, then retired); construction counts for note triggers.
