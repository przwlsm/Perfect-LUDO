// Original, deterministic synthesized sound effects. No recordings or third-party samples.
import fs from 'node:fs/promises';
const rate = 22050;
const out = new URL('../assets/audio/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const tone = (t, f, decay = 13) =>
  t < 0 ? 0 : Math.sin(2 * Math.PI * f * t) * Math.exp(-decay * t) * Math.min(1, t / 0.004);
function noise(i) {
  const n = Math.sin(i * 78.233 + 13.73) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}
const sounds = {
  roll: [
    0.48,
    (t, i) =>
      [0, 0.065, 0.14, 0.23, 0.34].reduce(
        (v, start, index) =>
          v +
          (t < start
            ? 0
            : (0.18 * noise(i) + tone(t - start, 480 + index * 95, 65)) *
              Math.exp(-(t - start) * 55)),
        0,
      ),
  ],
  step: [
    0.09,
    (t, i) =>
      0.6 * tone(t, 440, 65) + 0.25 * tone(t, 880, 80) + 0.04 * noise(i) * Math.exp(-t * 110),
  ],
  enter: [
    0.38,
    (t) =>
      0.55 * tone(t, 523.25, 15) +
      0.45 * tone(t - 0.085, 783.99, 15) +
      0.25 * tone(t - 0.16, 1046.5, 18),
  ],
  capture: [
    0.42,
    (t) =>
      0.7 * tone(t, 196, 18) + 0.55 * tone(t - 0.07, 392, 16) + 0.35 * tone(t - 0.15, 587.33, 16),
  ],
  home: [
    0.65,
    (t) =>
      0.5 * tone(t, 659.25, 9) + 0.4 * tone(t - 0.11, 783.99, 10) + 0.4 * tone(t - 0.22, 1046.5, 9),
  ],
  win: [
    1.1,
    (t) =>
      [523.25, 659.25, 783.99, 1046.5].reduce((v, f, i) => v + 0.45 * tone(t - i * 0.14, f, 7), 0),
  ],
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
console.log('Generated 6 original PCM sound effects.');
