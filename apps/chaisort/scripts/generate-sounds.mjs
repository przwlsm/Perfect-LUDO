// Original, deterministic synthesized sound effects for Chai Sort. No
// recordings or third-party samples. Run with `npm run sounds`; writes
// assets/audio/*.wav.
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

/** A tiny deterministic random sequence, so bubbles land in the same place every build. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One bubble: a sine whose pitch rises as it closes (how real bubbles sound). */
function bubble(f, length, gain) {
  return render(length, (t) => {
    const env = Math.min(1, t / 0.004) * Math.exp(-t * (14 / length));
    const pitch = f * (1 + 2.2 * (t / length));
    return gain * env * Math.sin(2 * Math.PI * pitch * t);
  });
}

/** Places tracks at offsets (seconds) into one buffer `seconds` long. */
function place(seconds, items) {
  const n = Math.ceil(seconds * RATE);
  const data = new Float32Array(n);
  for (const [at, track] of items) {
    const offset = Math.round(at * RATE);
    for (let i = 0; i < track.length && i + offset < n; i++) data[i + offset] += track[i];
  }
  return data;
}

/** A cup lifted off the counter: a dry clay scrape and a soft rise. */
const lift = mix(
  scale(
    lowpass(
      highpass(
        render(0.12, (t, i) => noise(i) * Math.sin(Math.PI * Math.min(1, t / 0.12))),
        900,
      ),
      4000,
    ),
    0.35,
  ),
  render(0.16, (t) => 0.25 * partial(t, 380 + 500 * t, 22)),
);

/** Two cups touching: bright, inharmonic, quick. */
const clink = mix(
  render(0.6, (t) =>
    [
      [2350, 1, 9],
      [3720, 0.55, 12],
      [5180, 0.3, 16],
      [6900, 0.15, 22],
    ].reduce((v, [f, g, d]) => v + g * 0.28 * partial(t, f, d, 0.001), 0),
  ),
  scale(
    highpass(
      render(0.02, (t, i) => noise(i * 3) * Math.exp(-t * 300)),
      5000,
    ),
    0.25,
  ),
);

/**
 * The pour: a stream of liquid and a run of bubbles whose pitch sits a step
 * higher in each of five versions. The game plays a higher one as the
 * receiving cup fills, so a cup "sings up" like the real thing.
 */
function pour(step) {
  const r = rng(101 + step);
  const base = 260 * Math.pow(1.22, step);
  const seconds = 0.62;
  const stream = scale(
    lowpass(
      highpass(
        render(seconds, (t, i) => {
          const env = Math.min(1, t / 0.05) * Math.min(1, (seconds - t) / 0.12);
          return noise(i + step * 977) * env;
        }),
        base * 1.6,
      ),
      base * 7,
    ),
    0.22,
  );
  const items = [];
  for (let k = 0; k < 9; k++) {
    const at = 0.03 + r() * 0.5;
    items.push([at, bubble(base * (0.85 + r() * 0.5), 0.05 + r() * 0.05, 0.24 + r() * 0.12)]);
  }
  return mix(stream, place(seconds, items));
}

/** A cup completed: a spoon tapped on a glass, twice, the second a fifth up. */
const ting = mix(
  scale(bell(1568, 1.4, 3.2), 0.36),
  place(1.6, [[0.09, scale(bell(2349.3, 1.4, 3.6), 0.26)]]),
);

/** The order complete: a shop bell, then a bright little run on top. */
const order = (() => {
  const notes = [783.99, 880, 987.77, 1174.66, 1318.51, 1567.98];
  const run = notes.map((f, k) => [0.18 + k * 0.085, scale(bell(f, 1.6, 2.4), 0.24 * (1 - k * 0.05))]);
  const shopBell = [
    [0, scale(bell(1975.5, 1.8, 2.2), 0.3)],
    [0.06, scale(bell(2489, 1.6, 2.6), 0.18)],
  ];
  const warm = render(2.4, (t) => {
    const env = Math.min(1, t / 0.3) * Math.exp(-t * 1.2);
    return env * 0.08 * (Math.sin(2 * Math.PI * 392 * t) + Math.sin(2 * Math.PI * 493.88 * t));
  });
  return mix(place(2.6, [...shopBell, ...run]), warm);
})();

/** A pour that cannot happen: two soft clay knocks. */
const nope = lowpass(
  render(0.32, (t) => 0.6 * partial(t, 170, 42) + 0.5 * partial(t - 0.12, 150, 42)),
  1300,
);

/** Undo: a short falling "bloop", like liquid drawn back. */
const undo = render(0.2, (t) => {
  const f = 640 - 1400 * t;
  return 0.4 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14) * Math.min(1, t / 0.005);
});

/** A star landing on the win card. */
const star = mix(
  render(
    0.9,
    (t) =>
      0.28 * partial(t, 1318.51, 5) + 0.16 * partial(t, 1975.53, 7) + 0.08 * partial(t, 2637, 9),
  ),
  scale(
    highpass(
      render(0.06, (t, i) => noise(i * 7) * Math.exp(-t * 70)),
      4500,
    ),
    0.18,
  ),
);

/** A hint: steam curling upward, a rising shimmer. */
const hint = mix(
  ...[0, 1, 2, 3, 4, 5].map((k) =>
    render(1.2, (t) => 0.12 * partial(t - k * 0.05, 659.25 * Math.pow(2, k / 5), 4.8, 0.01)),
  ),
  scale(
    lowpass(
      highpass(
        render(0.7, (t, i) => noise(i * 5) * Math.exp(-t * 4) * Math.min(1, t / 0.08)),
        2500,
      ),
      7000,
    ),
    0.1,
  ),
);

/** A lid lifting: a little brass "tink" and a pop of air. */
const lid = mix(
  render(0.5, (t) => 0.3 * partial(t, 1244.5, 10) + 0.14 * partial(t, 3110, 16)),
  render(0.12, (t) => 0.3 * Math.sin(2 * Math.PI * (200 + 900 * t) * t) * Math.exp(-t * 30)),
);

/**
 * The stall's simmer: a pan on a low flame, seamless when looped. Rendered
 * a little long, then the tail is cross-faded into the head.
 */
const simmer = (() => {
  const loop = 6;
  const fadeLen = 0.5;
  const r = rng(77);
  const items = [];
  for (let k = 0; k < 46; k++) {
    items.push([r() * loop, bubble(180 + r() * 260, 0.06 + r() * 0.08, 0.05 + r() * 0.07)]);
  }
  const body = mix(
    scale(
      lowpass(
        render(loop + fadeLen, (t, i) => noise(i * 11) * (0.8 + 0.2 * Math.sin(t * 1.3))),
        420,
      ),
      0.5,
    ),
    place(loop + fadeLen, items),
  );
  const n = Math.round(loop * RATE);
  const f = Math.round(fadeLen * RATE);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = body[i];
  for (let i = 0; i < f; i++) {
    const k = i / f;
    data[i] = body[i] * k + body[n + i] * (1 - k);
  }
  return data;
})();

const sounds = {
  tap: tick(),
  lift,
  clink,
  ting,
  order,
  nope,
  undo,
  star,
  hint,
  lid,
  ...Object.fromEntries([0, 1, 2, 3, 4].map((k) => [`pour${k + 1}`, pour(k)])),
};

for (const [name, data] of Object.entries(sounds)) await writeWav(out(name), data);
await writeWav(out('simmer'), simmer, { fade: false });
console.log(`Wrote ${Object.keys(sounds).length + 1} original sound effects to assets/audio/.`);
