"""Generate read-aloud audio for every sentence of the corpus.

Voice: Piper's Italian "paola" neural voice, driven by our own phoneme
transcription of the Greek (greek_ipa.py, Italian scheme), so it reads the
way an Italian liceo does. One MP3 per passage, plus an index per text with
each sentence's offset and estimated word start times.

Output:
  app/public/audio/<text>/<passage ref>.mp3
  app/public/audio/<text>.json
      { "<passage id>": { "f": "<text>/<ref>.mp3",
                          "s": { "<sentence id>": { "t": start_ms, "d": duration_ms, "w": [word_start_ms, ...] } } } }
  (w has one entry per non-punctuation token, in order)

Requirements: pip install onnxruntime numpy lameenc; the voice files come
from fetch.py (pipeline/sources/voices/it_IT-paola-medium.onnx + .json).

Usage: python3 pipeline/audio.py [text-id ...] [--speed 1.25] [--force] [--alphabet]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

import numpy as np

from common import OUT, SOURCES, ROOT, is_punct
from greek_ipa import word_ipa, to_ipa, PUNCT

AUDIO = ROOT / "app" / "public" / "audio"
VOICE = SOURCES / "voices" / "it_IT-paola-medium.onnx"
SCHEME = "it"
NOISE, NOISE_W = 0.4, 0.5   # less of the reader's breathiness than Piper's default 0.667 / 0.8
GAP_MS = 550          # silence between sentences inside a passage file
LEAD_MS = 60          # MP3 encoder delay compensation when seeking
BITRATE = 32

# relative durations for estimating word boundaries inside a sentence
W_VOWEL, W_LONG, W_CONS, W_H, W_SPACE, W_PUNCT = 1.0, 0.6, 0.5, 0.3, 0.35, 1.4
VOWEL_CHARS = set("aɛeiɔouyɪʊ")
TAIL_THRESHOLD = 0.02       # trailing near-silence (and breath noise) is cut; the start is kept


SAMPLE_RATE = 22050


def load_voice():
    global SAMPLE_RATE
    import onnxruntime as ort
    cfg = json.loads(Path(str(VOICE) + ".json").read_text(encoding="utf-8"))
    sess = ort.InferenceSession(str(VOICE), providers=["CPUExecutionProvider"])
    SAMPLE_RATE = cfg["audio"]["sample_rate"]
    return sess, cfg["phoneme_id_map"], SAMPLE_RATE


def weight(ch: str) -> float:
    if ch in VOWEL_CHARS:
        return W_VOWEL
    if ch == "ː":
        return W_LONG
    if ch == "h":
        return W_H
    if ch == " ":
        return W_SPACE
    if ch in ".,?!":
        return W_PUNCT
    if ch in "ˈˌ":
        return 0.0
    return W_CONS


def sentence_phonemes(tokens: list[dict]) -> tuple[str, list[int]]:
    """IPA for the sentence and, for each non-punct token, the char offset of
    its first phoneme in that string."""
    ipa = ""
    starts: list[int] = []
    for t in tokens:
        f = t["f"]
        if is_punct(f):
            p = PUNCT.get(f.strip())
            if p and ipa and not ipa.endswith(p):
                ipa += p
            continue
        w = word_ipa(f.strip("'ʼ’᾽"), SCHEME)
        if not w:
            w = "ɛ"  # unreadable token (numbers, symbols): a short filler
        if ipa and not ipa.endswith(" "):
            ipa += " "
        starts.append(len(ipa))
        ipa += w
    if ipa and ipa[-1] not in ".?!":
        ipa += "."
    return ipa, starts


def synth(sess, pmap, ipa: str, speed: float) -> np.ndarray:
    ids = [pmap["^"][0]]
    for ch in ipa:
        if ch in pmap:
            ids += [pmap[ch][0], pmap["_"][0]]
    ids.append(pmap["$"][0])
    out = sess.run(None, {
        "input": np.array([ids], dtype=np.int64),
        "input_lengths": np.array([len(ids)], dtype=np.int64),
        "scales": np.array([NOISE, speed, NOISE_W], dtype=np.float32),
    })[0]
    audio = np.clip(out.squeeze(), -1, 1)
    loud = np.where(np.abs(audio) > TAIL_THRESHOLD)[0]
    if len(loud):
        audio = audio[: min(len(audio), loud[-1] + int(0.08 * SAMPLE_RATE))]
    return audio


def encode_mp3(pcm: np.ndarray, rate: int) -> bytes:
    import lameenc
    enc = lameenc.Encoder()
    enc.set_bit_rate(BITRATE)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    enc.silence()
    data = (pcm * 32767).astype(np.int16).tobytes()
    return bytes(enc.encode(data)) + bytes(enc.flush())


def build_text(text_id: str, speed: float, force: bool) -> None:
    doc = json.loads((OUT / "texts" / f"{text_id}.json").read_text(encoding="utf-8"))
    index_path = AUDIO / f"{text_id}.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() and not force else {}
    sess, pmap, rate = load_voice()
    (AUDIO / text_id).mkdir(parents=True, exist_ok=True)
    gap = np.zeros(int(rate * GAP_MS / 1000), dtype=np.float32)
    t_start = time.time()
    total_sec = 0.0
    for p in doc["passages"]:
        fname = f"{text_id}/{re.sub(r'[^A-Za-z0-9.]+', '_', p['ref'])}.mp3"
        if p["id"] in index and (AUDIO / fname).exists():
            continue
        parts: list[np.ndarray] = []
        entry = {"f": fname, "s": {}}
        pos_ms = 0.0
        for s in p["s"]:
            ipa, starts = sentence_phonemes(s["t"])
            audio = synth(sess, pmap, ipa, speed)
            dur_ms = len(audio) / rate * 1000
            weights = [weight(ch) for ch in ipa]
            cum = np.cumsum([0.0] + weights)
            total = cum[-1] or 1.0
            words = [round(pos_ms + dur_ms * cum[i] / total) for i in starts]
            entry["s"][s["id"]] = {"t": round(pos_ms), "d": round(dur_ms), "w": words}
            parts.append(audio)
            parts.append(gap)
            pos_ms += dur_ms + GAP_MS
        pcm = np.concatenate(parts) if parts else np.zeros(rate // 10, dtype=np.float32)
        (AUDIO / fname).write_bytes(encode_mp3(pcm, rate))
        index[p["id"]] = entry
        index_path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        total_sec += pos_ms / 1000
        print(f"  {p['id']}: {len(p['s'])} sentences, {pos_ms/1000:.0f}s audio, {(AUDIO / fname).stat().st_size//1024} KB", flush=True)
    size = sum(f.stat().st_size for f in (AUDIO / text_id).glob("*.mp3"))
    print(f"{text_id}: {size/1e6:.1f} MB of audio in {time.time()-t_start:.0f}s", flush=True)


def build_alphabet(speed: float) -> None:
    """Letter names and example words for the alphabet page, read from
    app/src/content/alphabet.ts (ids, greekName, example)."""
    src = (ROOT / "app" / "src" / "content" / "alphabet.ts").read_text(encoding="utf-8")
    entries = re.findall(r"\{ id: '([^']+)'.*?(?:greekName: '([^']+)'.*?)?example: '([^']+)'", src, re.S)
    sess, pmap, rate = load_voice()
    AUDIO.mkdir(parents=True, exist_ok=True)
    gap = np.zeros(int(rate * 0.4), dtype=np.float32)
    parts: list[np.ndarray] = []
    index: dict[str, dict] = {}
    pos_ms = 0.0
    def add(key: str, text: str) -> None:
        nonlocal pos_ms
        ipa = to_ipa(text, SCHEME)
        audio = synth(sess, pmap, ipa, speed)
        dur = len(audio) / rate * 1000
        index[key] = {"t": round(pos_ms), "d": round(dur)}
        parts.append(audio); parts.append(gap)
        pos_ms += dur + 400
    for id_, greek_name, example in entries:
        if greek_name:
            add(f"{id_}.name", greek_name)
        add(f"{id_}.ex", example)
    (AUDIO / "alphabet.mp3").write_bytes(encode_mp3(np.concatenate(parts), rate))
    (AUDIO / "alphabet.json").write_text(json.dumps(index, separators=(",", ":")), encoding="utf-8")
    print(f"alphabet: {len(index)} clips, {pos_ms/1000:.0f}s, {(AUDIO / 'alphabet.mp3').stat().st_size//1024} KB")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("texts", nargs="*")
    ap.add_argument("--speed", type=float, default=1.25, help="Piper length scale; higher is slower")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--alphabet", action="store_true", help="only the alphabet page clips")
    a = ap.parse_args(argv)
    if not VOICE.exists():
        sys.exit(f"voice missing: {VOICE} (run fetch.py)")
    if a.alphabet:
        build_alphabet(a.speed)
        return 0
    ids = a.texts or [p.stem for p in sorted((OUT / "texts").glob("*.json"))]
    for t in ids:
        print(t, flush=True)
        build_text(t, a.speed, a.force)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
