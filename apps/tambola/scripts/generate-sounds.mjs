// Original, deterministic synthesized sound effects for Tambola Party. No
// recordings or third-party samples. Run with `npm run sounds`; the app
// plays the .wav files this writes to assets/audio/.
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
 * A wooden ball rolling out of the cage: a low, bumpy rumble that speeds up,
 * then the soft clack of it landing in the tray.
 */
function roll() {
  const len = 0.75;
  const rumble = lowpass(
    render(len, (t, i) => {
      const rate = 14 + t * 30; // bumps get quicker as it rolls
      const bump = 0.5 + 0.5 * Math.sin(2 * Math.PI * rate * t);
      const env = Math.min(1, t / 0.08) * (t < len - 0.12 ? 1 : Math.max(0, (len - t) / 0.12));
      return noise(i) * bump * env;
    }),
    500,
  );
  const clack = render(0.25, (t) => 0.6 * partial(t, 520, 38) + 0.3 * partial(t, 1180, 60));
  return mix(scale(rumble, 1.8), at(len - 0.08, clack));
}

/** The reveal: two bright bell notes, a fourth apart. */
function chime() {
  return mix(scale(bell(1318.5, 1.0, 5), 0.55), at(0.09, scale(bell(1760, 1.1, 4.5), 0.6)));
}

/** A dabber stamping the paper: a soft felt thump with a breath of air. */
function dab() {
  const thump = render(0.16, (t) => 0.9 * partial(t, 150, 32, 0.002) + 0.35 * partial(t, 310, 48, 0.002));
  const puff = highpass(
    render(0.08, (t, i) => noise(i) * Math.exp(-t * 70)),
    1600,
  );
  return mix(thump, scale(puff, 0.45));
}

/** Lifting a daub: a lighter, higher tap. */
function undab() {
  return render(0.1, (t) => 0.45 * partial(t, 520, 60, 0.002) + 0.15 * partial(t, 1040, 80));
}

/** A valid claim: a major arpeggio of bells over a shimmer of applause. */
function cheer() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  const arpeggio = mix(...notes.map((f, i) => at(i * 0.085, scale(bell(f, 1.3, 3.4), 0.5))));
  const chord = at(0.45, mix(...[523.25, 659.25, 783.99].map((f) => scale(bell(f, 1.2, 2.6), 0.28))));
  // Applause: many tiny claps (filtered noise bursts) at random-looking times.
  const claps = render(1.6, (t, i) => {
    const env = Math.min(1, t / 0.2) * Math.max(0, 1 - t / 1.6);
    const grain = Math.pow(Math.max(0, Math.sin(t * 173 + Math.sin(t * 61) * 4)), 18);
    return noise(i) * grain * env;
  });
  return mix(arpeggio, chord, scale(highpass(lowpass(claps, 4000), 700), 0.9));
}

/** A bogus claim: a soft, slightly comic "uh-oh" that falls. Never harsh. */
function bogus() {
  const note = (f0, f1, len) =>
    render(len, (t) => {
      const f = f0 + (f1 - f0) * (t / len);
      const env = Math.min(1, t / 0.02) * Math.exp(-t * 3.2);
      const phase = 2 * Math.PI * f * t;
      return env * (0.7 * Math.sin(phase) + 0.18 * Math.sin(2 * phase) + 0.08 * Math.sin(3 * phase));
    });
  return lowpass(mix(scale(note(392, 370, 0.22), 0.6), at(0.2, scale(note(330, 262, 0.5), 0.65))), 2200);
}

/** The game begins: three rising notes. */
function start() {
  return mix(
    scale(bell(784, 0.8, 4), 0.45),
    at(0.11, scale(bell(988, 0.8, 4), 0.45)),
    at(0.22, scale(bell(1175, 1.1, 3.5), 0.55)),
  );
}

await writeWav(out('roll'), roll());
await writeWav(out('chime'), chime());
await writeWav(out('dab'), dab());
await writeWav(out('undab'), undab());
await writeWav(out('cheer'), cheer());
await writeWav(out('bogus'), bogus());
await writeWav(out('tap'), tick());
await writeWav(out('start'), start());
console.log('Wrote sounds to assets/audio/.');
