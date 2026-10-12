/** Text to speech for a sentence, with word-level callbacks for highlighting.
 *
 *  Two engines:
 *   - "espeak": eSpeak NG compiled to WebAssembly, loaded on first use from
 *     public/espeak/. Its "grc" voice uses the reconstructed (Erasmian-type)
 *     pronunciation: distinct η/ει/ι/υ, vowel length, aspirated θ φ χ, pitch
 *     accent. Robotic, but accurate to the spelling.
 *   - "system": the browser's own speech synthesis with a Modern Greek voice.
 *     Natural, but modern pronunciation (itacism, fricative β δ γ, no length).
 */

export type EngineName = 'espeak' | 'system';

export interface SpeakOptions {
  rate: number;                                   // 1 = normal; 0.5 .. 1.5
  onWord?: (charStart: number) => void;           // 0-based offset into text
  onEnd?: () => void;
  onError?: (message: string) => void;
}

export interface Handle { stop: () => void }

// ---------------------------------------------------------------- eSpeak NG

interface EspeakWorker {
  set_voice(name: string): number;
  set_rate(wpm: number): number;
  synthesize(text: string, cb: (samples: Int16Array | null, events: EspeakEvent[] | null) => void): void;
}
interface EspeakEvent { type: string; text_position: number; word_length: number; audio_position: number }
interface EspeakModule { eSpeakNGWorker: new () => EspeakWorker }

const SAMPLE_RATE = 22050;
let espeakPromise: Promise<EspeakWorker> | null = null;
let audioCtx: AudioContext | null = null;

function assetUrl(file: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return new URL(`${base}/espeak/${file}`, document.baseURI).href;
}

export function loadEspeak(): Promise<EspeakWorker> {
  if (!espeakPromise) {
    espeakPromise = (async () => {
      const mod = await import(/* @vite-ignore */ assetUrl('espeak-ng.js'));
      // the data package is named .wasm because static hosts serve that type without fuss;
      // the loader only reads its bytes
      const m: EspeakModule = await mod.default({ locateFile: (p: string) => assetUrl(p === 'espeak-ng.data' ? 'espeak-ng.data.wasm' : p) });
      const w = new m.eSpeakNGWorker();
      if (w.set_voice('grc') !== 0) throw new Error('Ancient Greek voice not found in the eSpeak package');
      return w;
    })().catch((e) => { espeakPromise = null; throw e; });
  }
  return espeakPromise;
}

export const espeakLoaded = () => espeakPromise !== null;

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

async function speakEspeak(text: string, o: SpeakOptions): Promise<Handle> {
  const w = await loadEspeak();
  w.set_rate(Math.round(150 * o.rate));
  const chunks: Int16Array[] = [];
  const words: { pos: number; ms: number }[] = [];
  w.synthesize(text, (samples, events) => {
    if (samples) chunks.push(Int16Array.from(samples));
    if (events) for (const e of events) if (e.type === 'word') words.push({ pos: e.text_position - 1, ms: e.audio_position });
  });
  const n = chunks.reduce((a, c) => a + c.length, 0);
  if (n === 0) { o.onEnd?.(); return { stop: () => {} }; }
  const c = ctx();
  const buf = c.createBuffer(1, n, SAMPLE_RATE);
  const ch = buf.getChannelData(0);
  let off = 0;
  for (const chunk of chunks) { for (let i = 0; i < chunk.length; i++) ch[off + i] = chunk[i] / 32768; off += chunk.length; }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  const timers: number[] = [];
  let stopped = false;
  const t0 = c.currentTime;
  src.start(t0);
  for (const wd of words) timers.push(window.setTimeout(() => { if (!stopped) o.onWord?.(wd.pos); }, wd.ms));
  src.onended = () => { if (!stopped) { stopped = true; o.onEnd?.(); } };
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      timers.forEach(clearTimeout);
      try { src.stop(); } catch { /* already stopped */ }
      o.onEnd?.();
    },
  };
}

// ---------------------------------------------------------------- system voice

export function systemGreekVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => /^el/i.test(v.lang)) ?? null;
}

async function speakSystem(text: string, o: SpeakOptions): Promise<Handle> {
  if (typeof speechSynthesis === 'undefined') throw new Error('This browser has no speech synthesis');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = systemGreekVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'el-GR';
  u.rate = o.rate;
  let done = false;
  u.onboundary = (e) => { if (e.name === 'word' && !done) o.onWord?.(e.charIndex); };
  u.onend = () => { if (!done) { done = true; o.onEnd?.(); } };
  u.onerror = (e) => { if (!done) { done = true; o.onError?.(e.error); o.onEnd?.(); } };
  speechSynthesis.speak(u);
  return { stop: () => { if (!done) { done = true; speechSynthesis.cancel(); o.onEnd?.(); } } };
}

// ---------------------------------------------------------------- entry

export function speak(engine: EngineName, text: string, o: SpeakOptions): Promise<Handle> {
  return engine === 'espeak' ? speakEspeak(text, o) : speakSystem(text, o);
}

/** Join tokens into the string to speak; returns the text and each token's
 *  start offset in it (punctuation attached to the previous word). */
export function sentenceText(forms: string[], isPunct: (f: string) => boolean): { text: string; starts: number[] } {
  let text = '';
  const starts: number[] = [];
  forms.forEach((f, i) => {
    if (i > 0 && !isPunct(f)) text += ' ';
    starts.push(text.length);
    text += f;
  });
  return { text, starts };
}

/** Token index for a character offset reported by the engine (tolerant of
 *  small drifts from the engine's own text normalisation). */
export function tokenAt(starts: number[], forms: string[], pos: number, isPunct: (f: string) => boolean): number {
  let best = -1;
  for (let i = 0; i < starts.length; i++) {
    if (isPunct(forms[i])) continue;
    if (starts[i] <= pos + 1) best = i; else break;
  }
  return best;
}
