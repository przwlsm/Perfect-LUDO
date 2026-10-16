// Akshar's original, deterministic synthesized sound effects. No recordings
// or third-party samples. Run with `npm run sounds`; writes assets/audio/*.wav.
import {
  bell,
  highpass,
  lowpass,
  mix,
  noise,
  partial,
  RATE,
  render,
  scale,
  tick,
  writeWav,
} from 'app-kit/wav';

const out = (name) => new URL(`../assets/audio/${name}.wav`, import.meta.url);

/** A nib on paper: a short grainy rasp, soft at both ends. */
function scratch() {
  const grain = render(0.11, (t, i) => {
    const env = Math.sin(Math.PI * Math.min(1, t / 0.11)) ** 1.5;
    // Paper fibres: noise gated by a fast, uneven flutter.
    const flutter = 0.55 + 0.45 * Math.sin(2 * Math.PI * 170 * t + Math.sin(t * 90) * 2);
    return noise(i) * env * flutter;
  });
  return scale(lowpass(highpass(grain, 1800), 6500), 0.9);
}

/** A warm two-note chime for a letter well written. */
function chime() {
  const a = bell(880, 1.4, 3.2);
  const b = bell(1318.5, 1.3, 3.4);
  const delayed = new Float32Array(a.length + Math.round(RATE * 0.11));
  delayed.set(b, Math.round(RATE * 0.11));
  return scale(mix(scale(a, 0.55), scale(delayed, 0.5)), 0.9);
}

/** A rubber stamp landing (soft thump) with a little sparkle after it. */
function stamp() {
  const thump = render(0.25, (t, i) => {
    const body = partial(t, 95, 22) * 0.9 + partial(t, 190, 30) * 0.3;
    const pad = noise(i) * Math.exp(-t * 60) * 0.35;
    return body + pad;
  });
  const sparkle = render(0.9, (t) => {
    const notes = [1567.98, 2093, 2637, 3136];
    return notes.reduce((v, f, k) => v + 0.22 * partial(t - 0.08 - k * 0.06, f, 7), 0);
  });
  return mix(lowpass(thump, 1400), sparkle);
}

/** A page turning: a breathy sweep from low to high and back. */
function page() {
  const n = Math.round(RATE * 0.32);
  const data = render(0.32, (t, i) => {
    const env = Math.sin(Math.PI * (t / 0.32)) ** 2;
    return noise(i) * env;
  });
  // Sweep a one-pole low-pass upward, then let it fall.
  let y = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const cutoff = 600 + 4200 * Math.sin(Math.PI * p);
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
    data[i] = y += a * (data[i] - y);
  }
  return scale(highpass(data, 300), 1.3);
}

/** A gentle "not yet": two soft wooden notes, falling. */
function soft() {
  return render(0.5, (t) => {
    const n1 = partial(t, 523.25, 14) + 0.3 * partial(t, 1046.5, 20);
    const n2 = partial(t - 0.14, 392, 12) + 0.3 * partial(t - 0.14, 784, 18);
    return 0.45 * n1 + 0.45 * n2;
  });
}

await writeWav(out('scratch'), scratch());
await writeWav(out('chime'), chime());
await writeWav(out('stamp'), stamp());
await writeWav(out('page'), page());
await writeWav(out('tap'), tick());
await writeWav(out('soft'), soft());
console.log('Wrote sounds to assets/audio/.');
