// Original, deterministic synthesized sound effects. No recordings or third-party samples.
// Run with `npm run sounds`; the app plays the .wav files this writes to assets/audio/.
import fs from 'node:fs/promises';

const rate = 22050;
const out = new URL('../assets/audio/', import.meta.url);
await fs.mkdir(out, { recursive: true });

/** A struck note: a sine at `f` Hz that decays, with a 4 ms attack so it never clicks. */
const tone = (t, f, decay = 13) =>
  t < 0 ? 0 : Math.sin(2 * Math.PI * f * t) * Math.exp(-decay * t) * Math.min(1, t / 0.004);
/** Deterministic white noise. */
function noise(i) {
  const n = Math.sin(i * 78.233 + 13.73) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

const sounds = {
  // Picking a piece up: a short, light tick.
  select: [0.06, (t, i) => 0.5 * tone(t, 1320, 90) + 0.05 * noise(i) * Math.exp(-t * 160)],
  // A goat set on the board: wood on wood.
  place: [
    0.14,
    (t, i) => 0.7 * tone(t, 330, 45) + 0.3 * tone(t, 660, 70) + 0.08 * noise(i) * Math.exp(-t * 90),
  ],
  // A piece slid one step: softer and a little higher.
  move: [
    0.11,
    (t, i) =>
      0.55 * tone(t, 440, 60) + 0.25 * tone(t, 880, 80) + 0.05 * noise(i) * Math.exp(-t * 110),
  ],
  // A tiger's pounce: a low thud, then the goat is gone.
  capture: [
    0.45,
    (t, i) =>
      0.8 * tone(t, 150, 16) +
      0.5 * tone(t - 0.05, 300, 18) +
      0.12 * noise(i) * Math.exp(-t * 40) +
      0.3 * tone(t - 0.18, 220, 14),
  ],
  // The game is won: a rising major arpeggio.
  win: [
    1.1,
    (t) =>
      [523.25, 659.25, 783.99, 1046.5].reduce((v, f, i) => v + 0.45 * tone(t - i * 0.14, f, 7), 0),
  ],
  // The game is lost: two falling notes.
  lose: [0.8, (t) => 0.5 * tone(t, 392, 7) + 0.5 * tone(t - 0.28, 293.66, 6)],
};

for (const [name, [seconds, sample]] of Object.entries(sounds)) {
  const count = Math.ceil(seconds * rate);
  const data = Buffer.alloc(44 + count * 2);
  data.write('RIFF');
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const fade = Math.min(1, (count - i) / (rate * 0.025));
    data.writeInt16LE(Math.round(Math.tanh(sample(i / rate, i)) * 15000 * fade), 44 + i * 2);
  }
  await fs.writeFile(new URL(`${name}.wav`, out), data);
}
console.log(`Generated ${Object.keys(sounds).length} original PCM sound effects.`);
