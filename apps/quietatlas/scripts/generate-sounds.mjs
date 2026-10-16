// Original, deterministic synthesized sound effects. No recordings or third-party samples.
// Run with `npm run sounds`; the app plays the .wav files this writes to assets/audio/.
import fs from 'node:fs/promises';

const rate = 22050;
const out = new URL('../assets/audio/', import.meta.url);
await fs.mkdir(out, { recursive: true });

/** Deterministic white noise. */
function noise(i) {
  const n = Math.sin(i * 78.233 + 13.73) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}
/** A struck partial: a sine at `f` Hz that decays, with a soft attack so it never clicks. */
const partial = (t, f, decay, attack = 0.004) =>
  t < 0 ? 0 : Math.sin(2 * Math.PI * f * t) * Math.exp(-decay * t) * Math.min(1, t / attack);

/** Renders `seconds` of `sample(t, i)` into a Float32Array. */
function render(seconds, sample) {
  const n = Math.ceil(seconds * rate);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = sample(i / rate, i);
  return data;
}
/** One-pole low-pass filter, in place. */
function lowpass(data, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
  let y = 0;
  for (let i = 0; i < data.length; i++) data[i] = y += a * (data[i] - y);
  return data;
}
/** One-pole high-pass filter, in place. */
function highpass(data, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const a = rc / (rc + 1 / rate);
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    prevY = a * (prevY + x - prevX);
    prevX = x;
    data[i] = prevY;
  }
  return data;
}
function scale(data, gain) {
  for (let i = 0; i < data.length; i++) data[i] *= gain;
  return data;
}
function mix(...tracks) {
  const n = Math.max(...tracks.map((t) => t.length));
  const data = new Float32Array(n);
  for (const t of tracks) for (let i = 0; i < t.length; i++) data[i] += t[i];
  return data;
}

/** A bubble: a short burst of air, then the plastic's little thud. */
function pop(pitch) {
  const burst = highpass(
    render(0.09, (t, i) => noise(i) * Math.exp(-t * 90)),
    900 * pitch,
  );
  const thud = render(
    0.12,
    (t) => partial(t, 180 * pitch, 45) * 0.7 + partial(t, 420 * pitch, 70) * 0.25,
  );
  return mix(scale(burst, 1.4), thud);
}

/** Bell partial ratios of a small handbell, for chimes. */
function bell(f, seconds, decay) {
  return render(seconds, (t) =>
    [
      [1, 1],
      [2.0, 0.35],
      [2.76, 0.22],
      [5.4, 0.08],
    ].reduce(
      (v, [ratio, gain]) => v + gain * partial(t, f * ratio, decay * Math.sqrt(ratio), 0.01),
      0,
    ),
  );
}

/**
 * A singing bowl's voice. Partials are rounded to whole cycles of `loop`
 * seconds, so the sustained hum repeats with no seam; the slight detune
 * between pairs is the bowl's slow, breathing beat.
 */
const LOOP = 6;
const q = (f) => Math.round(f * LOOP) / LOOP;
const BOWL = [
  [q(196), 1],
  [q(196.5), 0.8],
  [q(196 * 2.71), 0.45],
  [q(196 * 2.71 + 0.66), 0.35],
  [q(196 * 5.17), 0.14],
  [q(196 * 8.4), 0.05],
];

const sounds = {
  pop: pop(1),
  popHigh: pop(1.25),
  popLow: pop(0.8),
  // A golden bubble: the pop, then a little rising sparkle.
  golden: mix(
    pop(1.1),
    ...[1318.5, 1760, 2093, 2637].map((f, k) =>
      render(1.4, (t) => 0.32 * partial(t - 0.05 - k * 0.07, f, 4.5, 0.006)),
    ),
  ),
  // Coloured powder falling between finger and floor.
  sprinkle: scale(
    highpass(
      render(
        0.16,
        (t, i) => noise(i) * noise(i * 7 + 3) * Math.sin(Math.PI * Math.min(1, t / 0.16)),
      ),
      2500,
    ),
    0.5,
  ),
  // A drop of ink landing on the water: a soft rising "bloop".
  ink: render(0.32, (t) => {
    const f = 260 + 420 * Math.min(1, t / 0.07);
    return 0.6 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14) * Math.min(1, t / 0.006);
  }),
  // A wet brush meeting stone.
  swish: scale(
    lowpass(
      highpass(
        render(0.4, (t, i) => noise(i) * Math.sin(Math.PI * Math.min(1, t / 0.4)) ** 2),
        400,
      ),
      3200,
    ),
    1.1,
  ),
  // A sheet of paper lifted from the tray.
  paper: scale(
    lowpass(
      render(0.7, (t, i) => noise(i) * Math.sin(Math.PI * Math.min(1, t / 0.7)) ** 1.5),
      1800,
    ),
    1.4,
  ),
  // The bowl struck with the mallet: every partial at once, ringing long.
  strike: render(
    7,
    (t, i) =>
      BOWL.reduce((v, [f, gain], k) => v + gain * partial(t, f, 0.45 + k * 0.12, 0.002), 0) * 0.55 +
      0.15 * noise(i) * Math.exp(-t * 120),
  ),
  // Breathing in and out: two soft bells.
  chime: scale(bell(880, 3, 1.4), 0.55),
  chimeLow: scale(bell(587.33, 3, 1.4), 0.55),
  // A soft button press.
  tap: render(0.06, (t) => 0.4 * partial(t, 1200, 90) + 0.2 * partial(t, 2400, 120)),
};

/** The sustained hum, seamless when looped (no fades). */
const hum = render(LOOP, (t) => {
  let v = 0;
  for (const [f, gain] of BOWL) v += gain * Math.sin(2 * Math.PI * f * t);
  return v * 0.32;
});

function wav(data, fade) {
  const count = data.length;
  const buf = Buffer.alloc(44 + count * 2);
  buf.write('RIFF');
  buf.writeUInt32LE(buf.length - 8, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const tail = fade ? Math.min(1, (count - i) / (rate * 0.03)) : 1;
    buf.writeInt16LE(Math.round(Math.tanh(data[i]) * 15000 * tail), 44 + i * 2);
  }
  return buf;
}

for (const [name, data] of Object.entries(sounds)) {
  await fs.writeFile(new URL(`${name}.wav`, out), wav(data, true));
}
await fs.writeFile(new URL('hum.wav', out), wav(hum, false));
console.log(`Generated ${Object.keys(sounds).length + 1} original PCM sound effects.`);
