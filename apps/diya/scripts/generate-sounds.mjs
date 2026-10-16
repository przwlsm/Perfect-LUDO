// Original, deterministic synthesized sound effects for Diya. No recordings
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

/** A piece settling into its cell: a soft wooden knock with a little brass ring. */
const place = mix(
  scale(
    highpass(
      render(0.05, (t, i) => noise(i) * Math.exp(-t * 140)),
      1400,
    ),
    0.6,
  ),
  render(0.25, (t) => 0.7 * partial(t, 170, 38) + 0.25 * partial(t, 340, 50)),
  render(0.5, (t) => 0.12 * partial(t - 0.01, 1320, 12) + 0.06 * partial(t - 0.01, 1980, 16)),
);

/** A mirror turning on its pin: a crisp, dry tick. */
const rotate = mix(
  scale(
    highpass(
      render(0.03, (t, i) => noise(i) * Math.exp(-t * 260)),
      2500,
    ),
    0.5,
  ),
  render(0.08, (t) => 0.35 * partial(t, 2100, 80) + 0.2 * partial(t, 3150, 110)),
);

/** A piece lifted back to the tray: a small rising "bloop". */
const lift = render(0.22, (t) => {
  const f = 320 + 380 * Math.min(1, t / 0.12);
  return 0.45 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 16) * Math.min(1, t / 0.006);
});

/** Something that cannot move: two muffled knocks. */
const nope = lowpass(
  render(0.3, (t) => 0.6 * partial(t, 150, 40) + 0.55 * partial(t - 0.11, 132, 40)),
  1200,
);

/**
 * A lamp catching light: a breath of air as the wick takes, then a warm bell.
 * Six of them climb a pentatonic scale (D E F# A B D), so lamps lit in turn
 * rise like a little tune.
 */
const SCALE = [587.33, 659.25, 739.99, 880, 987.77, 1174.66];
function light(f) {
  const whoosh = scale(
    lowpass(
      highpass(
        render(0.18, (t, i) => noise(i) * Math.sin(Math.PI * Math.min(1, t / 0.18))),
        600,
      ),
      3000,
    ),
    0.25,
  );
  const ring = render(2.2, (t) => {
    const b = [
      [1, 1],
      [2, 0.3],
      [3.01, 0.12],
      [4.2, 0.05],
    ].reduce((v, [r, g]) => v + g * partial(t - 0.04, f * r, 1.8 * Math.sqrt(r), 0.008), 0);
    // A soft fifth below for warmth.
    return b * 0.5 + 0.12 * partial(t - 0.04, f * 0.5, 2.2, 0.02);
  });
  return mix(whoosh, ring);
}

/** Every lamp at once: a falling-then-rising arpeggio over a warm chord, with sparkle. */
const win = (() => {
  const notes = [587.33, 739.99, 880, 1174.66, 1479.98, 1760];
  const arp = notes.map((f, k) => scale(bell(f, 2.6, 1.6), 0.32 * (1 - k * 0.06)));
  const n = Math.ceil(3.2 * RATE);
  const data = new Float32Array(n);
  arp.forEach((track, k) => {
    const offset = Math.round((0.05 + k * 0.11) * RATE);
    for (let i = 0; i < track.length && i + offset < n; i++) data[i + offset] += track[i];
  });
  const pad = render(3.2, (t) => {
    const env = Math.min(1, t / 0.4) * Math.exp(-t * 0.9);
    return (
      env *
      0.09 *
      (Math.sin(2 * Math.PI * 293.66 * t) +
        Math.sin(2 * Math.PI * 440 * t) +
        0.6 * Math.sin(2 * Math.PI * 587.33 * t))
    );
  });
  const sparkle = scale(
    highpass(
      render(
        1.6,
        (t, i) => noise(i) * noise(i * 3 + 1) * Math.exp(-t * 2.2) * (0.5 + 0.5 * Math.sin(t * 60)),
      ),
      5000,
    ),
    0.18,
  );
  return mix(data, pad, sparkle);
})();

/** A star landing on the win card. */
const star = mix(
  render(
    0.9,
    (t) =>
      0.3 * partial(t, 1567.98, 5) + 0.18 * partial(t, 2349.32, 7) + 0.08 * partial(t, 3135.96, 9),
  ),
  scale(
    highpass(
      render(0.08, (t, i) => noise(i) * Math.exp(-t * 60)),
      4000,
    ),
    0.2,
  ),
);

/** A hint: a shimmer that rises, like light finding its way. */
const hint = mix(
  ...[0, 1, 2, 3, 4, 5, 6].map((k) =>
    render(1.4, (t) => 0.13 * partial(t - k * 0.045, 880 * Math.pow(2, k / 5), 4.5, 0.01)),
  ),
  scale(
    highpass(
      render(0.6, (t, i) => noise(i) * Math.exp(-t * 5) * Math.min(1, t / 0.05)),
      6000,
    ),
    0.12,
  ),
);

/**
 * The beams' soft hum, seamless when looped: every partial is a whole number
 * of cycles in the loop, and a slow beat between two near partials makes it breathe.
 */
const LOOP = 4;
const q = (f) => Math.round(f * LOOP) / LOOP;
const HUM = [
  [q(110), 0.5],
  [q(110.5), 0.4],
  [q(220), 0.3],
  [q(330.25), 0.12],
  [q(440), 0.05],
];
const hum = render(
  LOOP,
  (t) => HUM.reduce((v, [f, g]) => v + g * Math.sin(2 * Math.PI * f * t), 0) * 0.35,
);

const sounds = {
  tap: tick(),
  place,
  rotate,
  lift,
  nope,
  win,
  star,
  hint,
  ...Object.fromEntries(SCALE.map((f, i) => [`light${i + 1}`, light(f)])),
};

for (const [name, data] of Object.entries(sounds)) await writeWav(out(name), data);
await writeWav(out('hum'), hum, { fade: false });
console.log(`Wrote ${Object.keys(sounds).length + 1} original sound effects to assets/audio/.`);
