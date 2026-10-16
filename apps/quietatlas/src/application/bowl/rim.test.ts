import { rub, SILENT_RIM, type RimState } from './rim';

/** Circles the rim at `speed` radians per second for `seconds`, 60 steps a second. */
function circleRim(start: RimState, speed: number, seconds: number, radius = 100): RimState {
  let s = start;
  let a = 0;
  const dt = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) {
    a += speed * dt;
    s = rub(s, { x: Math.cos(a) * radius * 0.9, y: Math.sin(a) * radius * 0.9 }, radius, dt);
  }
  return s;
}

describe('singing bowl rim', () => {
  it('starts silent', () => {
    expect(SILENT_RIM.level).toBe(0);
  });

  it('a steady circle brings it to voice', () => {
    expect(circleRim(SILENT_RIM, 7, 3).level).toBeGreaterThan(0.8);
  });

  it('a slow circle sings more softly than a quick one', () => {
    expect(circleRim(SILENT_RIM, 2, 3).level).toBeLessThan(circleRim(SILENT_RIM, 7, 3).level);
  });

  it('touching the middle of the bowl does nothing', () => {
    let s = SILENT_RIM;
    for (let i = 0; i < 120; i++) s = rub(s, { x: i % 10, y: 0 }, 100, 1 / 60);
    expect(s.level).toBe(0);
  });

  it('rings down slowly after the finger lifts', () => {
    const singing = circleRim(SILENT_RIM, 7, 3);
    let s = singing;
    for (let i = 0; i < 60; i++) s = rub(s, null, 100, 1 / 60);
    expect(s.level).toBeLessThan(singing.level);
    expect(s.level).toBeGreaterThan(0.2);
    for (let i = 0; i < 60 * 10; i++) s = rub(s, null, 100, 1 / 60);
    expect(s.level).toBe(0);
  });

  it('counts the way round across the seam', () => {
    const s = circleRim(SILENT_RIM, 6, 2);
    expect(s.travelled).toBeCloseTo(12, 0);
  });
});
