import { facing, project, tiltFor } from './projection';

describe('globe projection', () => {
  it('puts the centre point in the middle, facing the viewer', () => {
    const p = project(0, 30, (30 * Math.PI) / 180, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
    expect(p.depth).toBeCloseTo(1);
  });

  it('places east to the right and north up', () => {
    expect(project(0, 45, 0, 0).x).toBeGreaterThan(0);
    expect(project(45, 0, 0, 0).y).toBeGreaterThan(0);
  });

  it('hides the far side', () => {
    expect(project(0, 180, 0, 0).depth).toBeCloseTo(-1);
  });

  it('turns the short way to face a place', () => {
    const from = (170 * Math.PI) / 180;
    const to = facing(-170, from);
    expect(to - from).toBeCloseTo((20 * Math.PI) / 180);
    expect(project(10, -170, to, 0).depth).toBeGreaterThan(0.9);
  });

  it('keeps the tilt gentle', () => {
    expect(tiltFor(80)).toBeLessThanOrEqual(0.6);
    expect(tiltFor(-80)).toBeGreaterThanOrEqual(-0.5);
  });
});
