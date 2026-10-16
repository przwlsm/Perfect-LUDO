// Original, deterministic synthesized sound effects for Monsoon Fields. No
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

/** A small seeded random source, so every run writes the same files. */
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

/** Adds `track` into `data` starting at `at` seconds. */
function place(data, track, at, gain = 1) {
  const offset = Math.round(at * RATE);
  for (let i = 0; i < track.length && i + offset < data.length; i++) data[i + offset] += track[i] * gain;
  return data;
}

/** A single water drop: a sine that bends up quickly, the "plip" of a drop meeting water. */
function drop(f, seconds = 0.09, gain = 0.5) {
  return render(seconds, (t) => {
    const bend = f * (1 + 0.9 * Math.min(1, t / 0.035));
    return gain * Math.sin(2 * Math.PI * bend * t) * Math.exp(-t * 55) * Math.min(1, t / 0.002);
  });
}

/** Stone on stone: a dry knock, a hollow body, and a smaller knock as it settles. */
const clack = (() => {
  const knock = (gain) =>
    mix(
      scale(highpass(render(0.04, (t, i) => noise(i) * Math.exp(-t * 170)), 1100), 0.55 * gain),
      render(0.16, (t) => gain * (0.55 * partial(t, 610, 55) + 0.3 * partial(t, 1390, 85) + 0.12 * partial(t, 2730, 120))),
    );
  const data = new Float32Array(Math.ceil(0.22 * RATE));
  place(data, knock(1), 0);
  place(data, knock(0.35), 0.028);
  return lowpass(data, 5200);
})();

/** Something that will not turn: two muffled knocks on wet stone. */
const nope = lowpass(
  render(0.3, (t) => 0.6 * partial(t, 140, 40) + 0.5 * partial(t - 0.11, 124, 40)),
  1000,
);

/** A rice shoot popping up: a quick rising blip and a little leafy rustle. */
const sprout = mix(
  render(0.16, (t) => {
    const f = 420 + 700 * Math.min(1, t / 0.05);
    return 0.5 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 26) * Math.min(1, t / 0.004);
  }),
  scale(highpass(render(0.07, (t, i) => noise(i * 7 + 3) * Math.exp(-t * 60)), 3500), 0.12),
);

/**
 * A field filling: a drop, then a soft wooden-water bell. Six of them climb a
 * pentatonic scale (C D E G A C), so fields watered in turn rise like a tune.
 */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
function chime(f) {
  const body = render(1.8, (t) => {
    const tt = t - 0.03;
    return (
      0.42 * partial(tt, f, 2.2, 0.006) +
      0.14 * partial(tt, f * 2, 3.8, 0.006) +
      0.07 * partial(tt, f * 3.98, 7, 0.004) +
      0.1 * partial(tt, f * 0.5, 2.6, 0.02)
    );
  });
  return mix(drop(f * 1.5, 0.08, 0.32), body);
}

/** Water spilling from an open end: a short wash of filtered noise and a few droplets. */
const splash = (() => {
  const r = rng(11);
  const wash = scale(
    lowpass(
      highpass(
        render(0.32, (t, i) => noise(i * 3 + 1) * Math.min(1, t / 0.015) * Math.exp(-t * 11)),
        900,
      ),
      4200,
    ),
    0.38,
  );
  const data = new Float32Array(Math.ceil(0.45 * RATE));
  place(data, wash, 0);
  for (let k = 0; k < 6; k++) place(data, drop(900 + r() * 1400, 0.07, 0.18), 0.02 + r() * 0.3);
  return data;
})();

/** A small tree frog, far off: two soft pulsed croaks. */
const frog = (() => {
  const croak = (f, seconds) =>
    lowpass(
      render(seconds, (t) => {
        const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 34 * t);
        const env = Math.sin(Math.PI * Math.min(1, t / seconds)) ** 0.7;
        const body =
          Math.sin(2 * Math.PI * f * t) +
          0.5 * Math.sin(2 * Math.PI * f * 2.02 * t) +
          0.25 * Math.sin(2 * Math.PI * f * 3.1 * t);
        return 0.32 * body * pulse * pulse * env;
      }),
      1400,
    );
  const data = new Float32Array(Math.ceil(0.7 * RATE));
  place(data, croak(205, 0.16), 0);
  place(data, croak(185, 0.24), 0.26);
  return data;
})();

/** Clouds part: a rising arpeggio of water bells over a warm chord, and birds. */
const win = (() => {
  const n = Math.ceil(3.4 * RATE);
  const data = new Float32Array(n);
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
  notes.forEach((f, k) => place(data, scale(bell(f, 2.6, 1.7), 0.3 * (1 - k * 0.06)), 0.05 + k * 0.12));
  const pad = render(3.4, (t) => {
    const env = Math.min(1, t / 0.5) * Math.exp(-t * 0.85);
    return env * 0.08 * (Math.sin(2 * Math.PI * 261.63 * t) + Math.sin(2 * Math.PI * 392 * t) + 0.6 * Math.sin(2 * Math.PI * 523.25 * t));
  });
  place(data, pad, 0);
  // Birds: quick falling-then-rising chirps, high and light.
  const r = rng(5);
  const chirp = (f) =>
    render(0.09, (t) => {
      const sweep = f * (1 + 0.35 * Math.sin(Math.PI * Math.min(1, t / 0.09)));
      return 0.12 * Math.sin(2 * Math.PI * sweep * t) * Math.sin(Math.PI * Math.min(1, t / 0.09));
    });
  for (let k = 0; k < 7; k++) place(data, chirp(3000 + r() * 1600), 0.9 + k * 0.16 + r() * 0.06);
  return data;
})();

/** A star landing on the win card: a bright drop of a bell. */
const star = mix(
  render(0.9, (t) => 0.3 * partial(t, 1567.98, 5) + 0.18 * partial(t, 2349.32, 7) + 0.08 * partial(t, 3135.96, 9)),
  drop(2200, 0.06, 0.15),
);

/** A hint: water finding its way, a run of drops rising. */
const hint = (() => {
  const data = new Float32Array(Math.ceil(1.1 * RATE));
  [0, 1, 2, 3, 4, 5].forEach((k) => place(data, drop(700 * Math.pow(2, k / 5), 0.12, 0.45), k * 0.06));
  place(data, scale(bell(1760, 0.9, 4), 0.22), 0.38);
  return data;
})();

/**
 * The rain bed: soft wide rain with drops on leaves, and a trickle of water
 * running through stone channels. Seamless when looped: the tail is
 * cross-faded into the head.
 */
const rain = (() => {
  const LOOP = 6;
  const FADE = 0.6;
  const r = rng(77);
  const bed = scale(lowpass(highpass(render(LOOP + FADE, (t, i) => noise(i * 13 + 5)), 400), 2600), 0.2);
  const hiss = scale(highpass(render(LOOP + FADE, (t, i) => noise(i * 29 + 11)), 5000), 0.05);
  const data = mix(bed, hiss);
  // Drops on leaves.
  for (let k = 0; k < 140; k++) place(data, drop(1200 + r() * 2200, 0.05, 0.06 + r() * 0.07), r() * LOOP);
  // The trickle: small bubbles in running water.
  for (let k = 0; k < 220; k++) {
    const f = 500 + r() * 900;
    const len = 0.03 + r() * 0.05;
    place(data, render(len, (t) => 0.07 * Math.sin(2 * Math.PI * f * (1 + 2.2 * t) * t) * Math.sin(Math.PI * t / len)), r() * LOOP);
  }
  const loop = new Float32Array(Math.ceil(LOOP * RATE));
  const fade = Math.ceil(FADE * RATE);
  for (let i = 0; i < loop.length; i++) {
    loop[i] = data[i];
    if (i < fade) {
      const k = i / fade;
      loop[i] = data[i] * k + data[i + loop.length] * (1 - k);
    }
  }
  return loop;
})();

const sounds = {
  tap: tick(),
  clack,
  nope,
  sprout,
  splash,
  frog,
  win,
  star,
  hint,
  ...Object.fromEntries(SCALE.map((f, i) => [`chime${i + 1}`, chime(f)])),
};

for (const [name, data] of Object.entries(sounds)) await writeWav(out(name), data);
await writeWav(out('rain'), rain, { fade: false });
console.log(`Wrote ${Object.keys(sounds).length + 1} original sound effects to assets/audio/.`);
