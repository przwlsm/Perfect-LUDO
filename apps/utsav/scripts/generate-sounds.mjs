// Original, deterministic synthesized sound effects for Utsav. No recordings
// or third-party samples. Run with `npm run sounds`; writes assets/audio/*.wav.
import { bell, highpass, lowpass, mix, noise, partial, render, scale, tick, writeWav, RATE } from 'app-kit/wav';

const out = (name) => new URL(`../assets/audio/${name}.wav`, import.meta.url);

/** Fairy dust: a quick run of tiny high bells over a breath of shimmer. */
function sparkle() {
  const notes = [2093, 2637, 3136, 3951, 4186];
  const bells = notes.map((f, k) =>
    render(0.9, (t) => 0.22 * partial(t - k * 0.045, f, 9, 0.003) + 0.08 * partial(t - k * 0.045, f * 2.01, 14, 0.003)),
  );
  const shimmer = scale(
    highpass(render(0.4, (t, i) => noise(i) * Math.sin(Math.PI * Math.min(1, t / 0.4)) ** 2), 5000),
    0.12,
  );
  return mix(...bells, shimmer);
}

/**
 * A card flying off: a breathy whoosh whose brightness sweeps upward, with
 * a soft rising tone under it.
 */
function whoosh() {
  const seconds = 0.6;
  const n = Math.ceil(seconds * RATE);
  const data = new Float32Array(n);
  let low = 0;
  let band = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.sin(Math.PI * Math.min(1, t / seconds)) ** 1.6;
    // A low-pass whose cutoff climbs from 400 Hz to 5 kHz.
    const cutoff = 400 + 4600 * (t / seconds) ** 1.4;
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
    low += a * (noise(i) - low);
    band += 0.2 * (low - band);
    data[i] = (low - band) * env * 2.2;
  }
  const tone = render(seconds, (t) => {
    const f = 300 + 500 * (t / seconds) ** 2;
    return 0.12 * Math.sin(2 * Math.PI * f * t) * Math.sin(Math.PI * Math.min(1, t / seconds));
  });
  return mix(data, tone);
}

/** Success: two warm bells, a fifth apart, the second a touch later. */
function chime() {
  const second = bell(1568, 2.2, 2.4);
  const delayed = new Float32Array(second.length + Math.round(0.12 * RATE));
  delayed.set(second, Math.round(0.12 * RATE));
  return mix(scale(bell(1046.5, 2.2, 2.2), 0.45), scale(delayed, 0.38));
}

await writeWav(out('tap'), tick());
await writeWav(out('sparkle'), sparkle());
await writeWav(out('whoosh'), lowpass(whoosh(), 9000));
await writeWav(out('chime'), chime());
console.log('Wrote 4 original sound effects to assets/audio/.');
