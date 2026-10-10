/** Grammar notes, each tied to a construction detector and a count threshold.
 *  Framed as differences from Latin; illustrated by the reader with the
 *  sentences the learner has just read. */

export interface GrammarNote {
  id: string;
  title: string;
  detector: string;       // key in DETECTORS
  threshold: number;      // occurrences met before the note appears
  latin: string;          // one line: what a Latinist already knows / must unlearn
  body: string[];         // short paragraphs
  tags: string[];
}

export const NOTES: GrammarNote[] = [
  {
    id: 'article', title: 'The article ὁ, ἡ, τό', detector: 'article', threshold: 12,
    latin: 'Latin has no article. Greek uses one constantly, and it does more than "the".',
    body: [
      'ὁ ἡ τό agrees with its noun in gender, number and case, and marks a noun as definite. Proper names and abstract nouns take it freely (ὁ Σωκράτης, ἡ ἀρετή), where Latin has nothing.',
      'It also turns almost anything into a noun: an adjective (οἱ ἀγαθοί, the good), a participle (ὁ λέγων, the one speaking), an infinitive (τὸ λέγειν, speaking), a prepositional phrase (οἱ ἐν τῇ πόλει, those in the city). When you meet an article with no noun after it, look for one of these.',
      'Position matters: ὁ σοφὸς ἀνήρ and ὁ ἀνὴρ ὁ σοφός both mean "the wise man" (attributive), but ὁ ἀνὴρ σοφός means "the man is wise" (predicative).',
    ],
    tags: ['nouns'],
  },
  {
    id: 'gen_abs', title: 'Genitive absolute', detector: 'gen_abs', threshold: 4,
    latin: 'This is the ablative absolute, with the genitive doing the job.',
    body: [
      'A participle and its subject stand together in the genitive, grammatically detached from the main clause: τοῦ ἡλίου ἀνατείλαντος, "the sun having risen", like sole orto.',
      'Translate as a clause: "when", "while", "since", "although" according to context. As in Latin, the subject of the absolute is normally not the subject of the main verb; if it were, Greek would use a plain nominative participle agreeing with it.',
    ],
    tags: ['participle', 'cases'],
  },
  {
    id: 'ptc_circumstantial', title: 'Circumstantial participles', detector: 'ptc_circumstantial', threshold: 8,
    latin: 'Latin uses participles sparingly and has only two of them; Greek has a participle for every tense and voice and uses them where Latin would write a subordinate clause.',
    body: [
      'A participle agreeing with a noun in the sentence and not preceded by the article describes the circumstances of the main action: ταῦτα εἰπὼν ἀπῆλθεν, "having said this, he left".',
      'Tense of the participle is relative to the main verb: aorist usually means before it (εἰπών, having said), present means at the same time (λέγων, while saying), future means purpose (λέξων, in order to say).',
      'Reading strategy: find the finite verb first, then attach each participle to the noun it agrees with. Long Greek sentences are often one main verb with a chain of participles.',
    ],
    tags: ['participle'],
  },
  {
    id: 'ptc_attributive', title: 'Participles with the article', detector: 'ptc_attributive', threshold: 6,
    latin: 'Where Latin writes a relative clause (qui dicit), Greek very often writes article plus participle (ὁ λέγων).',
    body: [
      'An article directly before a participle makes it attributive: οἱ φεύγοντες, "those who are fleeing"; ἡ πόλις ἡ ἁλοῦσα, "the city that was captured".',
      'Treat article + participle as a relative clause when translating, and watch for the participle\'s own objects sitting between the article and the participle: ὁ τὴν πόλιν σώσας, "the man who saved the city".',
    ],
    tags: ['participle'],
  },
  {
    id: 'ptc_supplementary', title: 'Supplementary participles', detector: 'ptc_supplementary', threshold: 5,
    latin: 'Where Latin uses an infinitive after verbs like video or scio, Greek often uses a participle.',
    body: [
      'Verbs of perceiving, knowing, showing and of beginning, ceasing and enduring take a participle to complete their meaning: οἶδα θνητὸς ὤν, "I know I am mortal"; ἔτυχε παρών, "he happened to be present"; ἐπαύσατο λέγων, "he stopped speaking".',
      'The participle agrees with the subject or the object, whichever the perception is about: ὁρῶ σε φεύγοντα, "I see you fleeing".',
    ],
    tags: ['participle'],
  },
  {
    id: 'ptc_future', title: 'Future participle of purpose', detector: 'ptc_future', threshold: 3,
    latin: 'Latin can express purpose with the future participle only after verbs of motion in the supine; Greek uses the future participle freely, sometimes with ὡς.',
    body: [
      'ἦλθε λυσόμενος θύγατρα, "he came to ransom his daughter". After verbs of motion the future participle states purpose; ὡς before it stresses the intention.',
    ],
    tags: ['participle'],
  },
  {
    id: 'middle', title: 'The middle voice', detector: 'middle', threshold: 8,
    latin: 'Latin deponents (sequor, utor) are the fossil of this. Greek keeps a living middle voice alongside active and passive.',
    body: [
      'Middle forms show the subject acting on or for itself, or with some personal involvement: λούομαι, "I wash myself"; πορεύομαι, "I make my way"; παρασκευάζομαι, "I get ready".',
      'Many common verbs are middle only (deponent) and simply active in meaning: γίγνομαι, βούλομαι, μάχομαι, ἔρχομαι. Learn them as vocabulary.',
      'In the present, imperfect, perfect and pluperfect, middle and passive share one set of forms; context decides. Only the aorist and future have distinct passive forms.',
    ],
    tags: ['verbs'],
  },
  {
    id: 'aorist_passive', title: 'Aorist passive in -θη-', detector: 'aorist_passive', threshold: 4,
    latin: 'Latin forms the perfect passive with a participle and sum; Greek has a one-word aorist passive built with -θη- (or -η-).',
    body: [
      'ἐλύθη, "he was released"; ἐπαιδεύθησαν, "they were educated". Endings are active-looking (-ην, -ης, -η, -ημεν, -ητε, -ησαν), so do not be misled by the active shape.',
      'A few verbs use the aorist passive with middle or intransitive meaning: ἐφοβήθην, "I became afraid"; ἐπορεύθην, "I travelled".',
    ],
    tags: ['verbs'],
  },
  {
    id: 'aorist_and_imperfect', title: 'Aorist and imperfect', detector: 'aorist_and_imperfect', threshold: 5,
    latin: 'Latin has one past narrative tense, the perfect (dixit), beside the imperfect. Greek splits the perfect\'s job: the aorist narrates events, the perfect describes a present state.',
    body: [
      'The aorist is the plain past of narrative: ἦλθεν, εἶπεν, ἐποίησεν. It views the action as a whole. The imperfect views it as ongoing, repeated or attempted: ἔλεγεν, "he was saying, kept saying, began to say".',
      'In a story, aorists carry the plot forward and imperfects fill in the background, exactly like the French passé simple and imparfait or the Italian passato remoto and imperfetto.',
      'Outside the indicative (infinitive, participle, subjunctive, optative, imperative) the aorist usually has no past meaning at all; it only marks the action as a single whole, against the present stem\'s ongoing aspect.',
    ],
    tags: ['verbs'],
  },
  {
    id: 'perfect', title: 'The perfect: a present state', detector: 'perfect', threshold: 5,
    latin: 'Do not translate the Greek perfect like the Latin perfect. Latin dixit is Greek aorist; the Greek perfect is closer to Latin memini or novi.',
    body: [
      'The perfect expresses a state in the present resulting from a past action: τέθνηκε, "he is dead"; οἶδα, "I know" (perfect of a root meaning "to see"); γέγραφα, "I have written and the writing stands".',
      'Reduplication (λέ-λυκα, γέ-γραφα) marks the stem, and κ with active endings marks the first perfect. The pluperfect is the same state in the past.',
    ],
    tags: ['verbs'],
  },
  {
    id: 'optative', title: 'The optative', detector: 'optative', threshold: 4,
    latin: 'Latin merged optative and subjunctive into one mood. Greek keeps both.',
    body: [
      'Recognise it by the diphthong before the ending: -οι-, -αι-, -ει-: λύοιμι, λύσαιμι, εἴην.',
      'Two main uses. On its own it expresses a wish (εἴθε γένοιτο, "would that it might happen") or, with ἄν, a polite potential statement (λέγοιμι ἄν, "I would say"). In subordinate clauses it replaces the subjunctive or indicative after a past main verb, in purpose clauses, indirect speech and general conditions.',
      'When you see an optative in a dependent clause, check the tense of the main verb: if it is past, the optative is probably just the sign of indirect speech and carries no special meaning.',
    ],
    tags: ['verbs', 'moods'],
  },
  {
    id: 'subjunctive', title: 'Subjunctive and ἄν', detector: 'an_particle', threshold: 5,
    latin: 'Greek ἄν has no Latin equivalent. It modifies the mood it accompanies rather than meaning anything by itself.',
    body: [
      'Subjunctive with ἄν in a subordinate clause (ἐάν, ὅταν, ὃς ἄν, ἐπειδάν) means an indefinite or future condition: ὅταν ἔλθῃ, "whenever he comes" or "when he comes (in the future)".',
      'Optative or past indicative with ἄν in a main clause is potential or counterfactual: ποιήσαιμι ἄν, "I would do"; ἐποίησα ἄν, "I would have done".',
      'The subjunctive on its own in a main clause is hortatory (ἴωμεν, "let us go") or deliberative (τί εἴπω, "what am I to say?"), and after μή it is a prohibition (μὴ ποιήσῃς, "do not do it").',
    ],
    tags: ['verbs', 'moods'],
  },
  {
    id: 'inf_articular', title: 'Articular infinitive', detector: 'inf_articular', threshold: 3,
    latin: 'Latin makes a noun of a verb with the gerund (legendi, legendo); Greek puts the neuter article in front of the infinitive and declines the article.',
    body: [
      'τὸ λέγειν, "speaking"; τοῦ λέγειν, "of speaking"; ἐν τῷ λέγειν, "in speaking"; διὰ τὸ λέγειν, "because of speaking". The infinitive itself never changes.',
      'The infinitive can keep its objects and even its own accusative subject inside the phrase: τὸ τοὺς παῖδας μανθάνειν, "the children\'s learning".',
    ],
    tags: ['infinitive'],
  },
  {
    id: 'acc_inf', title: 'Accusative and infinitive', detector: 'acc_inf', threshold: 4,
    latin: 'The same construction as Latin dicit eum venire, but Greek uses it less and competes with ὅτι clauses and participles.',
    body: [
      'After verbs of saying, thinking and commanding, the subject of the infinitive goes into the accusative: νομίζω αὐτὸν σοφὸν εἶναι, "I think he is wise".',
      'If the subject of the infinitive is the same as the subject of the main verb, Greek leaves it out and any predicate stays nominative: νομίζει σοφὸς εἶναι, "he thinks he is wise".',
      'The tense of the infinitive is relative: present = same time, aorist = before (or just aspect), future = after.',
    ],
    tags: ['infinitive'],
  },
  {
    id: 'hoti_clause', title: 'ὅτι and ὡς clauses', detector: 'hoti_clause', threshold: 5,
    latin: 'Classical Latin avoids a "that" clause after verbs of saying; Greek uses one all the time, with the indicative.',
    body: [
      'λέγει ὅτι ἔρχεται, "he says that he is coming". The verb inside keeps the tense and mood of the original words, so Greek indirect speech reads like a quotation.',
      'After a past main verb the indicative may be changed to the optative of the same tense: ἔλεγεν ὅτι ἔλθοι, "he said that he had come". ὡς is a slightly more subjective "that", often "how" or "that supposedly".',
    ],
    tags: ['clauses'],
  },
  {
    id: 'hina_purpose', title: 'Purpose with ἵνα, ὅπως, ὡς', detector: 'hina_purpose', threshold: 3,
    latin: 'Like Latin ut with the subjunctive, except that after a past main verb Greek may use the optative instead.',
    body: [
      'ἵνα μάθῃς, "so that you may learn"; ἦλθεν ἵνα ἴδοι, "he came to see". Negative purpose uses ἵνα μή (Latin ne).',
      'In Koine (John) ἵνα spreads far beyond purpose and often just introduces a clause where Attic would use an infinitive.',
    ],
    tags: ['clauses'],
  },
  {
    id: 'hoste', title: 'Result with ὥστε', detector: 'hoste', threshold: 3,
    latin: 'Latin has one result construction, ut with the subjunctive. Greek has two, and the mood tells you which.',
    body: [
      'ὥστε with the indicative states an actual result: οὕτως ἔδραμεν ὥστε ἔφυγεν, "he ran so fast that he escaped".',
      'ὥστε with the infinitive states a natural or intended result: οὕτως σοφός ἐστιν ὥστε πάντα εἰδέναι, "so wise as to know everything".',
    ],
    tags: ['clauses'],
  },
  {
    id: 'conditional', title: 'Conditions', detector: 'conditional', threshold: 5,
    latin: 'The pattern matches Latin si clauses except that Greek shows the type of condition by the particle ἄν and the choice of mood more systematically.',
    body: [
      'εἰ + indicative, indicative in the main clause: a plain condition about a particular case ("if he is here, he knows").',
      'ἐάν (εἰ + ἄν) + subjunctive, future or present in the main clause: future or general ("if he comes, I will go").',
      'εἰ + optative, optative + ἄν: remote future ("if he should come, I would go"). εἰ + past indicative, past indicative + ἄν: counterfactual ("if he had come, I would have gone").',
    ],
    tags: ['clauses'],
  },
  {
    id: 'relative', title: 'Relative clauses and attraction', detector: 'relative', threshold: 6,
    latin: 'ὅς ἥ ὅ works like qui quae quod, with two Greek habits to watch: case attraction and the missing antecedent.',
    body: [
      'The relative often takes the case of its antecedent instead of the case its own clause demands: ἄξιος τῆς ἀρετῆς ἧς ἔχει (expected ἥν). This is called attraction and is common.',
      'The antecedent is frequently left out: ἃ εἶπε, "the things which he said". The relative then does the work of article + participle.',
      'Distinguish ὅς from the article: the relative has a rough breathing and an accent (ὅς, ἥ, ὅ), the article has a smooth breathing or none (ὁ, ἡ, τό).',
    ],
    tags: ['clauses'],
  },
  {
    id: 'men_de', title: 'μέν … δέ', detector: 'men_de', threshold: 4,
    latin: 'There is no Latin equivalent. The closest is the pair quidem … autem, used far less often.',
    body: [
      'μέν marks the first of two balanced items, δέ the second: οἱ μὲν ἔμενον, οἱ δὲ ἔφυγον, "some stayed, others fled". Neither word usually needs translating; the balance does.',
      'Both are postpositive: they come second in their phrase. When you read μέν, expect a δέ later and hold the two halves together.',
    ],
    tags: ['particles'],
  },
  {
    id: 'particles', title: 'Particles: γάρ, οὖν, δή, γε, ἄρα', detector: 'particles', threshold: 8,
    latin: 'Latin has nam, igitur, quidem; Greek has far more of these words and uses them in almost every sentence of dialogue.',
    body: [
      'γάρ gives a reason ("for"), οὖν draws a consequence ("so, then"), δή stresses what precedes ("indeed, precisely"), γε limits or emphasises one word ("at least, at any rate"), ἄρα marks a conclusion or a realisation ("then, so it seems").',
      'They are postpositive, standing second in the clause. In dialogue they carry the tone of voice; in narrative they mark the joints of the argument. Do not translate them one for one; read them as signposts.',
    ],
    tags: ['particles'],
  },
  {
    id: 'negation_me', title: 'οὐ and μή', detector: 'negation_me', threshold: 6,
    latin: 'Latin has non and ne; Greek has οὐ and μή, and the split is similar but drawn differently.',
    body: [
      'οὐ negates facts: indicative statements, and the optative with ἄν. μή negates everything that is willed or hypothetical: imperatives, subjunctives, infinitives (except in indirect speech), participles with a conditional sense, and purpose clauses.',
      'Both can pile up: οὐδεὶς οὐδὲν εἶπεν, "nobody said anything", where the negatives reinforce rather than cancel.',
    ],
    tags: ['particles'],
  },
  {
    id: 'autos', title: 'αὐτός: self, same, him', detector: 'autos', threshold: 6,
    latin: 'αὐτός covers Latin ipse, idem and (in the oblique cases) is, ea, id.',
    body: [
      'With the article between it and the noun, "the same": ὁ αὐτὸς ἀνήρ. Without the article in attributive position, "self": αὐτὸς ὁ ἀνήρ or ὁ ἀνὴρ αὐτός, "the man himself".',
      'In the genitive, dative and accusative without emphasis it is simply the third-person pronoun "him, her, it, them": εἶδον αὐτόν, "I saw him". It is never used that way in the nominative.',
    ],
    tags: ['pronouns'],
  },
  {
    id: 'tis', title: 'τίς and τις', detector: 'tis', threshold: 6,
    latin: 'Latin quis and aliquis look different; Greek distinguishes them by accent alone.',
    body: [
      'τίς, τί with an acute accent that never changes is the interrogative "who? what?". τις, τι without an accent (or with a grave when it leans on the next word) is the enclitic indefinite "someone, something, a certain".',
      'τί on its own at the start of a sentence often means "why?".',
    ],
    tags: ['pronouns'],
  },
  {
    id: 'demonstratives', title: 'οὗτος, ὅδε, ἐκεῖνος', detector: 'demonstratives', threshold: 6,
    latin: 'The three correspond roughly to hic, iste, ille, with ὅδε pointing forward and οὗτος pointing back.',
    body: [
      'ὅδε: "this here", what follows or is about to be said. οὗτος: "this", what was just mentioned, or the person near you (sometimes contemptuous). ἐκεῖνος: "that", distant in place or time.',
      'They stand outside the article: οὗτος ὁ ἀνήρ or ὁ ἀνὴρ οὗτος, never ὁ οὗτος ἀνήρ.',
    ],
    tags: ['pronouns'],
  },
  {
    id: 'prepositions', title: 'Prepositions and their cases', detector: 'prepositions', threshold: 10,
    latin: 'Latin prepositions take one case (or two, like in). Many Greek prepositions take three, with a different meaning for each.',
    body: [
      'παρά: with genitive "from beside", dative "beside", accusative "to beside, along, contrary to". ἐπί, πρός, ὑπό, περί, μετά, κατά, διά all shift meaning with the case.',
      'A rough rule: genitive = motion from or source, dative = position at, accusative = motion towards or extent. The Greek genitive also took over the Latin ablative\'s separative uses, and the dative took its instrumental and locative uses.',
    ],
    tags: ['cases'],
  },
  {
    id: 'dative', title: 'The dative does the ablative\'s work', detector: 'dative', threshold: 12,
    latin: 'Greek lost the ablative. Its instrumental and locative uses went to the dative, its separative uses to the genitive.',
    body: [
      'Dative of means: λίθοις ἔβαλλον, "they threw stones" (Latin lapidibus). Dative of manner, respect, time when (τῇ ὑστεραίᾳ, "on the next day"), accompaniment (with or without σύν), and the possessor (ἔστι μοι, "I have").',
      'The dative also keeps the plain indirect-object use shared with Latin.',
    ],
    tags: ['cases'],
  },
  {
    id: 'mi_verbs', title: 'Verbs in -μι', detector: 'mi_verbs', threshold: 8,
    latin: 'Latin has one athematic verb, sum. Greek has a small group of very frequent ones.',
    body: [
      'εἰμί (be), εἶμι (go), φημί (say), δίδωμι (give), τίθημι (put), ἵστημι (set up), ἵημι (send), δείκνυμι (show), and their compounds. They attach endings directly to the stem, with a long vowel in the singular and a short one in the plural: δίδωμι, δίδομεν; τίθημι, τίθεμεν.',
      'Their aorists are irregular and worth learning as forms: ἔδωκα/ἔδομεν, ἔθηκα/ἔθεμεν, ἔστην, ἧκα.',
    ],
    tags: ['verbs'],
  },
  {
    id: 'neuter_plural_subject', title: 'Neuter plural subject, singular verb', detector: 'neuter_plural_subject', threshold: 3,
    latin: 'Unlike Latin, a neuter plural subject takes a singular verb.',
    body: [
      'τὰ ζῷα τρέχει, "the animals run". The old collective sense of the neuter plural survives in the agreement.',
    ],
    tags: ['nouns'],
  },
  {
    id: 'vocative', title: 'ὦ and the vocative', detector: 'vocative', threshold: 5,
    latin: 'Like Latin o, but Greek ὦ is the normal, neutral way to address someone, not an emotional one.',
    body: [
      'ὦ Σώκρατες, ὦ ἄνδρες Ἀθηναῖοι. Leaving out ὦ sounds brusque. The vocative differs from the nominative mainly in the second declension masculine singular (-ε) and in some third-declension nouns.',
    ],
    tags: ['nouns'],
  },
  {
    id: 'crasis_elision', title: 'Elision and crasis', detector: 'crasis_elision', threshold: 6,
    latin: 'Latin writes every word in full; Greek drops and merges vowels in writing, so some words look unfamiliar until you undo the merge.',
    body: [
      'Elision drops a final short vowel before a word beginning with a vowel and marks it with an apostrophe: ἀλλʼ ἐγώ for ἀλλὰ ἐγώ, δʼ for δέ, ἀφʼ οὗ for ἀπὸ οὗ (the π becomes φ before a rough breathing).',
      'Crasis merges two words into one, marked by a coronis that looks like a smooth breathing inside the word: κἀγώ = καὶ ἐγώ, τοὔνομα = τὸ ὄνομα, κἄν = καὶ ἐάν.',
    ],
    tags: ['spelling'],
  },
];

export const NOTE_BY_ID: Record<string, GrammarNote> = Object.fromEntries(NOTES.map((n) => [n.id, n]));
