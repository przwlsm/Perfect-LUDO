// Speak Local's original, deterministic synthesized sound effects. No
// recordings or third-party samples. Run with `npm run sounds`; writes
// assets/audio/*.wav.
import { bell, highpass, lowpass, mix, noise, partial, RATE, render, scale, writeWav } from 'app-kit/wav';

const out = (name) => new URL(`../assets/audio/${name}.wav`, import.meta.url);

/** A soft, round tap: a wooden bead on a glass, short and quiet. */
function tap() {
  return render(0.07, (t) => 0.42 * partial(t, 980, 85) + 0.18 * partial(t, 1960, 120) + 0.1 * partial(t, 520, 60));
}

/** Correct: two bright, rising bell notes (a happy "ding-ding"). */
function correct() {
  const a = bell(1046.5, 0.9, 5);
  const b = bell(1568, 1.1, 4.4);
  const gap = Math.round(RATE * 0.09);
  const both = new Float32Array(b.length + gap);
  both.set(a);
  const late = new Float32Array(b.length + gap);
  late.set(b, gap);
  return scale(mix(scale(both, 0.5), scale(late, 0.55)), 0.85);
}

/** Wrong, but kind: one low, soft wooden "hm" that falls a little. Never a buzzer. */
function wrong() {
  return render(0.42, (t) => {
    const f = 330 - 60 * Math.min(1, t / 0.3);
    return 0.5 * partial(t, f, 9) + 0.18 * partial(t, f * 2, 14);
  });
}

/** Streak chime: an auto-rickshaw-horn-shaped arpeggio, played on bells. */
function chime() {
  const notes = [784, 987.8, 1174.7, 1568];
  return scale(
    render(1.6, (t) => notes.reduce((v, f, k) => v + 0.26 * partial(t - k * 0.085, f, 3.2), 0)),
    0.85,
  );
}

/** Recording starts: a gentle rising blip with a breath of air. */
function recStart() {
  const tone = render(0.2, (t) => {
    const f = 620 + 900 * Math.min(1, t / 0.12);
    return 0.45 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14) * Math.min(1, t / 0.005);
  });
  const air = scale(lowpass(highpass(render(0.12, (t, i) => noise(i) * Math.exp(-t * 40)), 2500), 7000), 0.12);
  return mix(tone, air);
}

/** Recording stops: the same blip, falling. */
function recStop() {
  return render(0.2, (t) => {
    const f = 1500 - 900 * Math.min(1, t / 0.12);
    return 0.45 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14) * Math.min(1, t / 0.005);
  });
}

await writeWav(out('tap'), tap());
await writeWav(out('correct'), correct());
await writeWav(out('wrong'), wrong());
await writeWav(out('chime'), chime());
await writeWav(out('recStart'), recStart());
await writeWav(out('recStop'), recStop());
console.log('Wrote sounds to assets/audio/.');
