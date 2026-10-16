// Original, deterministic synthesized sound effects for Kolam. No recordings
// or third-party samples. Run with `npm run sounds`; the app plays the .wav
// files this writes to assets/audio/.
import {
  RATE,
  bell,
  highpass,
  lowpass,
  mix,
  noise,
  partial,
  render,
  scale,
  tick,
  writeWav,
} from 'app-kit/wav';

const out = (name) => new URL(`../assets/audio/${name}.wav`, import.meta.url);

/** Delays a track by `seconds` (for building chords and arpeggios). */
function at(seconds, track) {
  const pad = Math.round(seconds * RATE);
  const data = new Float32Array(pad + track.length);
  data.set(track, pad);
  return data;
}

/**
 * A pinch of rice flour landing: a soft, woody tick with a breath of grain,
 * pitched a little differently each time the app picks a voice.
 */
function segment() {
  const tock = render(0.12, (t) => 0.7 * partial(t, 880, 70, 0.002) + 0.22 * partial(t, 1760, 110, 0.002));
  const grain = highpass(
    render(0.07, (t, i) => noise(i) * Math.exp(-t * 60) * Math.min(1, t / 0.004)),
    2500,
  );
  return mix(tock, scale(grain, 0.35));
}

/** Marking "no line here": a drier, lower tap, like a fingertip on stone. */
function cross() {
  return mix(
    render(0.09, (t) => 0.55 * partial(t, 520, 85, 0.002) + 0.18 * partial(t, 1300, 130, 0.002)),
    scale(highpass(render(0.04, (t, i) => noise(i) * Math.exp(-t * 120)), 1800), 0.2),
  );
}

/** Brushing flour away: a short, soft swish. */
function erase() {
  const len = 0.16;
  const swish = render(len, (t, i) => {
    const env = Math.sin(Math.PI * Math.min(1, t / len)) ** 2;
    return noise(i) * env;
  });
  return scale(lowpass(highpass(swish, 1400), 6000), 0.5);
}

/** A hint: a quick shimmer of tiny high bells, rising. */
function hint() {
  const notes = [1567.98, 1975.53, 2349.32, 3135.96];
  const bells = mix(...notes.map((f, i) => at(i * 0.045, scale(bell(f, 0.7, 7), 0.32))));
  const sparkle = render(0.5, (t, i) => {
    const env = Math.min(1, t / 0.05) * Math.exp(-t * 7);
    const glint = Math.pow(Math.max(0, Math.sin(t * 211 + Math.sin(t * 37) * 3)), 24);
    return noise(i) * glint * env;
  });
  return mix(bells, scale(highpass(sparkle, 5000), 0.5));
}

/**
 * The kolam blooms: a rising cascade of bells on the Mohanam scale (the
 * five-note morning raga) over a soft drone of Sa and Pa.
 */
function solve() {
  const sa = 261.63;
  const ratios = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3];
  const cascade = mix(
    ...ratios.map((r, i) => at(i * 0.11, scale(bell(sa * 2 * r, 2.2, 2.6 + i * 0.15), 0.34 - i * 0.015))),
  );
  const close = at(
    ratios.length * 0.11 + 0.08,
    mix(...[1, 5 / 4, 3 / 2, 2].map((r) => scale(bell(sa * 2 * r, 2.4, 1.8), 0.2))),
  );
  const droneLen = 3.2;
  const drone = render(droneLen, (t) => {
    const env = Math.min(1, t / 0.5) * Math.max(0, Math.min(1, (droneLen - t) / 1.2));
    const tone = (f) => Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) + 0.15 * Math.sin(6 * Math.PI * f * t);
    return env * (0.11 * tone(sa / 2) + 0.07 * tone((sa / 2) * 1.5));
  });
  return mix(cascade, close, lowpass(drone, 1800));
}

await writeWav(out('tap'), tick());
await writeWav(out('segment'), segment());
await writeWav(out('cross'), cross());
await writeWav(out('erase'), erase());
await writeWav(out('hint'), hint());
await writeWav(out('solve'), solve());
console.log('Wrote sounds to assets/audio/.');
