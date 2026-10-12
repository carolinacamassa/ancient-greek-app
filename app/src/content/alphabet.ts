/** The alphabet and the marks, as a Latinist meets them, with the sound the
 *  recordings use (the school pronunciation). Each entry has a Greek name or
 *  sample and an example word; the pipeline records both (audio/alphabet.*). */

export interface AlphabetEntry {
  id: string;
  letter: string;        // Α α
  name: string;          // alpha
  greekName: string;     // ἄλφα (what is spoken for "name")
  latin: string;         // Latin transliteration
  sound: string;         // how it is pronounced here
  note?: string;         // for a Latinist
  example: string;       // Greek word (spoken)
  exampleGloss: string;
}

export const LETTERS: AlphabetEntry[] = [
  { id: 'alpha', letter: 'Α α', name: 'alpha', greekName: 'ἄλφα', latin: 'a', sound: 'a, as in Italian; short or long in the original', example: 'ἄνθρωπος', exampleGloss: 'human being' },
  { id: 'beta', letter: 'Β β', name: 'beta', greekName: 'βῆτα', latin: 'b', sound: 'b', example: 'βίος', exampleGloss: 'life' },
  { id: 'gamma', letter: 'Γ γ', name: 'gamma', greekName: 'γάμμα', latin: 'g', sound: 'hard g as in gold; before γ κ χ ξ it is the ng of angle', note: 'ἄγγελος is angelos, which is where Latin got the spelling', example: 'ἄγγελος', exampleGloss: 'messenger' },
  { id: 'delta', letter: 'Δ δ', name: 'delta', greekName: 'δέλτα', latin: 'd', sound: 'd', example: 'δῆμος', exampleGloss: 'people' },
  { id: 'epsilon', letter: 'Ε ε', name: 'epsilon', greekName: 'ἒ ψιλόν', latin: 'e', sound: 'closed e, as in Italian sera', note: 'the name means "plain e", to tell it from αι once the two had merged', example: 'ἔργον', exampleGloss: 'work' },
  { id: 'zeta', letter: 'Ζ ζ', name: 'zeta', greekName: 'ζῆτα', latin: 'z', sound: 'dz, as in Italian zero; in classical Attic probably zd', example: 'Ζεύς', exampleGloss: 'Zeus' },
  { id: 'eta', letter: 'Η η', name: 'eta', greekName: 'ἦτα', latin: 'ē', sound: 'open e, as in Italian bello, and long in the original', note: 'not the Latin h; Latin borrowed Greek η as ē (σκηνή, scaena)', example: 'ἥλιος', exampleGloss: 'sun' },
  { id: 'theta', letter: 'Θ θ', name: 'theta', greekName: 'θῆτα', latin: 'th', sound: 't in these recordings, as in Italian classrooms; in classical Attic an aspirated t, as in English top', note: 'Latin wrote th: θέατρον, theatrum', example: 'θεός', exampleGloss: 'god' },
  { id: 'iota', letter: 'Ι ι', name: 'iota', greekName: 'ἰῶτα', latin: 'i', sound: 'i; short or long in the original', note: 'before a vowel it stays a vowel, never the y-sound Latin i can have', example: 'ἵππος', exampleGloss: 'horse' },
  { id: 'kappa', letter: 'Κ κ', name: 'kappa', greekName: 'κάππα', latin: 'c', sound: 'k, always hard', note: 'Latin c: Κικέρων is Cicero', example: 'κακός', exampleGloss: 'bad' },
  { id: 'lambda', letter: 'Λ λ', name: 'lambda', greekName: 'λάμβδα', latin: 'l', sound: 'l', example: 'λόγος', exampleGloss: 'word, account' },
  { id: 'mu', letter: 'Μ μ', name: 'mu', greekName: 'μῦ', latin: 'm', sound: 'm', example: 'μήτηρ', exampleGloss: 'mother' },
  { id: 'nu', letter: 'Ν ν', name: 'nu', greekName: 'νῦ', latin: 'n', sound: 'n', note: 'the small ν looks like a Latin v; it is n', example: 'νόμος', exampleGloss: 'law, custom' },
  { id: 'xi', letter: 'Ξ ξ', name: 'xi', greekName: 'ξῖ', latin: 'x', sound: 'ks, as Latin x', example: 'ξένος', exampleGloss: 'stranger, guest' },
  { id: 'omicron', letter: 'Ο ο', name: 'omicron', greekName: 'ὂ μικρόν', latin: 'o', sound: 'closed o, as in Italian sole', note: '"small o", as against ω, "big o"', example: 'ὁδός', exampleGloss: 'road' },
  { id: 'pi', letter: 'Π π', name: 'pi', greekName: 'πῖ', latin: 'p', sound: 'p', example: 'πόλις', exampleGloss: 'city' },
  { id: 'rho', letter: 'Ρ ρ', name: 'rho', greekName: 'ῥῶ', latin: 'r, rh', sound: 'r as in Italian; at the start of a word it carries a rough breathing, ῥ, which Latin wrote rh', note: 'the small ρ looks like a Latin p; it is r', example: 'ῥήτωρ', exampleGloss: 'speaker' },
  { id: 'sigma', letter: 'Σ σ ς', name: 'sigma', greekName: 'σίγμα', latin: 's', sound: 's, always voiceless; ς is the form used at the end of a word', example: 'σοφός', exampleGloss: 'wise' },
  { id: 'tau', letter: 'Τ τ', name: 'tau', greekName: 'ταῦ', latin: 't', sound: 't', example: 'τέχνη', exampleGloss: 'craft' },
  { id: 'upsilon', letter: 'Υ υ', name: 'upsilon', greekName: 'ὖ ψιλόν', latin: 'y', sound: 'i in these recordings; in the original ü, as in French tu, which Italian classrooms often keep', note: 'Latin borrowed it as the letter y precisely because it was not u', example: 'ὕδωρ', exampleGloss: 'water' },
  { id: 'phi', letter: 'Φ φ', name: 'phi', greekName: 'φῖ', latin: 'ph', sound: 'f, as in Italian classrooms; in classical Attic an aspirated p', note: 'Latin wrote ph: φιλοσοφία, philosophia', example: 'φίλος', exampleGloss: 'friend' },
  { id: 'chi', letter: 'Χ χ', name: 'chi', greekName: 'χῖ', latin: 'ch', sound: 'k in these recordings, as in Italian classrooms; in classical Attic an aspirated k, and in many traditions the ch of German Bach', note: 'Latin wrote ch: χορός, chorus. Not the Latin x', example: 'χρόνος', exampleGloss: 'time' },
  { id: 'psi', letter: 'Ψ ψ', name: 'psi', greekName: 'ψῖ', latin: 'ps', sound: 'ps, both sounds, also at the start of a word', example: 'ψυχή', exampleGloss: 'soul' },
  { id: 'omega', letter: 'Ω ω', name: 'omega', greekName: 'ὦ μέγα', latin: 'ō', sound: 'open o, as in Italian cotto, and long in the original', note: '"big o"', example: 'ὥρα', exampleGloss: 'hour, season' },
];

export interface MarkEntry {
  id: string;
  sign: string;
  name: string;
  sound: string;
  note?: string;
  example: string;
  exampleGloss: string;
}

export const DIPHTHONGS: MarkEntry[] = [
  { id: 'ai', sign: 'αι', name: 'alpha iota', sound: 'ai, as in Italian mai', note: 'Latin ae: Αἰγαῖος, Aegaeus', example: 'καί', exampleGloss: 'and' },
  { id: 'ei', sign: 'ει', name: 'epsilon iota', sound: 'ei, e and i in one syllable; in classical Attic a long closed e', note: 'Latin i or ei: Νεῖλος, Nilus', example: 'εἰμί', exampleGloss: 'I am' },
  { id: 'oi', sign: 'οι', name: 'omicron iota', sound: 'oi, as in Italian poi', note: 'Latin oe: Φοῖβος, Phoebus', example: 'οἶνος', exampleGloss: 'wine' },
  { id: 'ui', sign: 'υι', name: 'upsilon iota', sound: 'ui, rare', example: 'υἱός', exampleGloss: 'son' },
  { id: 'au', sign: 'αυ', name: 'alpha upsilon', sound: 'au, as in Italian aula', example: 'αὐτός', exampleGloss: 'self, same' },
  { id: 'eu', sign: 'ευ', name: 'epsilon upsilon', sound: 'eu, as in Italian Europa, in one syllable', example: 'εὖ', exampleGloss: 'well' },
  { id: 'ou', sign: 'ου', name: 'omicron upsilon', sound: 'long u, as in Italian luna', note: 'the plain u of Greek: ὑ is ü, ου is u', example: 'οὐρανός', exampleGloss: 'sky' },
  { id: 'subscript', sign: 'ᾳ ῃ ῳ', name: 'iota subscript', sound: 'the small iota under the vowel is silent; the vowel is long', note: 'it marks old diphthongs with a long first vowel, ᾱι ηι ωι; frequent in the dative singular', example: 'τῇ ὁδῷ', exampleGloss: 'to the road' },
];

export const MARKS: MarkEntry[] = [
  { id: 'rough', sign: '῾ ἁ ἑ ἡ', name: 'rough breathing', sound: 'an h before the vowel in the original; silent in these recordings, as in most Italian classrooms', note: 'Greek has no letter h; every word beginning with a vowel carries a breathing, and ῥ and ὑ always have the rough one', example: 'ὁδός', exampleGloss: 'road' },
  { id: 'smooth', sign: '᾿ ἀ ἐ ἠ', name: 'smooth breathing', sound: 'nothing: the vowel begins plainly', example: 'ἀγαθός', exampleGloss: 'good' },
  { id: 'acute', sign: '´ ά έ ή', name: 'acute accent', sound: 'the stressed syllable, as Italian reads it; in classical Attic a rise in pitch', note: 'it can stand on any of the last three syllables', example: 'λόγος', exampleGloss: 'word' },
  { id: 'grave', sign: '` ὰ ὲ ὴ', name: 'grave accent', sound: 'an acute on the last syllable, written grave when another word follows', example: 'καλὸς ἀνήρ', exampleGloss: 'a handsome man' },
  { id: 'circumflex', sign: '῀ ᾶ ῆ ῶ', name: 'circumflex', sound: 'stressed; the vowel was long', note: 'only on a long vowel or diphthong, on one of the last two syllables', example: 'τῶν θεῶν', exampleGloss: 'of the gods' },
  { id: 'diaeresis', sign: '¨ ϊ ϋ', name: 'diaeresis', sound: 'the two vowels are separate syllables, not a diphthong', example: 'Ἀΐδης', exampleGloss: 'Hades' },
  { id: 'elision', sign: '’', name: 'apostrophe', sound: 'a final short vowel dropped before a vowel, as in Italian l\'amico', example: 'ἀλλ’ ἐγώ', exampleGloss: 'but I' },
  { id: 'punct', sign: '· ;', name: 'punctuation', sound: 'the raised dot is a semicolon or colon; the Greek semicolon is a question mark', example: 'τί φῄς;', exampleGloss: 'what do you say?' },
];
