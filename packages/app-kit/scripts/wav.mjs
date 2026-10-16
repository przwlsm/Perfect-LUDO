// Building blocks for original, deterministic synthesized sound effects (no
// recordings, no third-party samples). Apps import these in their own
// `scripts/generate-sounds.mjs`:
//
//   import { render, partial, noise, mix, scale, bell, writeWav } from 'app-kit/wav';
//   await writeWav(new URL('../assets/audio/pop.wav', import.meta.url), pop);
import fs from 'node:fs/promises';

export const RATE = 22050;

/** Deterministic white noise, -1..1. */
export function noise(i) {
  const n = Math.sin(i * 78.233 + 13.73) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

/** A struck partial: a sine at `f` Hz that decays, with a soft attack so it never clicks. */
export const partial = (t, f, decay, attack = 0.004) =>
  t < 0 ? 0 : Math.sin(2 * Math.PI * f * t) * Math.exp(-decay * t) * Math.min(1, t / attack);

/** Renders `seconds` of `sample(t, i)` into a Float32Array. */
export function render(seconds, sample) {
  const n = Math.ceil(seconds * RATE);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = sample(i / RATE, i);
  return data;
}

/** One-pole low-pass filter, in place. */
export function lowpass(data, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  for (let i = 0; i < data.length; i++) data[i] = y += a * (data[i] - y);
  return data;
}

/** One-pole high-pass filter, in place. */
export function highpass(data, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const a = rc / (rc + 1 / RATE);
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

export function scale(data, gain) {
  for (let i = 0; i < data.length; i++) data[i] *= gain;
  return data;
}

/** Sums tracks of any lengths. */
export function mix(...tracks) {
  const n = Math.max(...tracks.map((t) => t.length));
  const data = new Float32Array(n);
  for (const t of tracks) for (let i = 0; i < t.length; i++) data[i] += t[i];
  return data;
}

/** A small handbell at `f` Hz (four inharmonic partials). */
export function bell(f, seconds, decay) {
  return render(seconds, (t) =>
    [
      [1, 1],
      [2.0, 0.35],
      [2.76, 0.22],
      [5.4, 0.08],
    ].reduce((v, [ratio, gain]) => v + gain * partial(t, f * ratio, decay * Math.sqrt(ratio), 0.01), 0),
  );
}

/** A short UI tick for buttons. */
export const tick = () => render(0.06, (t) => 0.4 * partial(t, 1200, 90) + 0.2 * partial(t, 2400, 120));

/**
 * Writes 16-bit mono PCM. Soft-clips with tanh; `fade` adds a 30 ms tail so
 * one-shots never click (leave it off for seamless loops).
 */
export async function writeWav(url, data, { fade = true } = {}) {
  const count = data.length;
  const buf = Buffer.alloc(44 + count * 2);
  buf.write('RIFF');
  buf.writeUInt32LE(buf.length - 8, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const tail = fade ? Math.min(1, (count - i) / (RATE * 0.03)) : 1;
    buf.writeInt16LE(Math.round(Math.tanh(data[i]) * 15000 * tail), 44 + i * 2);
  }
  await fs.mkdir(new URL('.', url), { recursive: true });
  await fs.writeFile(url, buf);
}
