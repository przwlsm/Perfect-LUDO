import { circle, contains, coversRect, polygonArea, resample, Tray } from './Tray';

const area = (p: number[]) => Math.abs(polygonArea(p));

describe('Tray', () => {
  it('drops a circle of the requested size', () => {
    const tray = new Tray(400, 400);
    tray.drop(200, 200, 40, '#f00');
    expect(tray.drops).toHaveLength(1);
    expect(area(tray.drops[0]!.points)).toBeCloseTo(Math.PI * 40 * 40, -2);
  });

  it('a drop inside another preserves the old ink area as a ring around it', () => {
    const tray = new Tray(400, 400);
    tray.drop(200, 200, 40, '#f00');
    tray.drop(200, 200, 30, '#00f');
    const [outer, inner] = tray.drops;
    // Outer boundary encloses old ink + new ink: π(40² + 30²).
    expect(area(outer!.points)).toBeCloseTo(Math.PI * (40 * 40 + 30 * 30), -2);
    expect(area(inner!.points)).toBeCloseTo(Math.PI * 30 * 30, -2);
  });

  it('a nearby drop pushes ink aside without changing its area', () => {
    const tray = new Tray(400, 400);
    tray.drop(150, 200, 30, '#f00');
    const before = area(tray.drops[0]!.points);
    tray.drop(215, 200, 30, '#00f');
    expect(area(tray.drops[0]!.points)).toBeCloseTo(before, -1);
    // …and nothing of the old drop is left under the new one.
    expect(contains(tray.drops[0]!.points, 215, 200)).toBe(false);
  });

  it('growing a drop in steps equals dropping it at full size', () => {
    const a = new Tray(400, 400);
    a.drop(100, 200, 30, '#f00');
    a.drop(180, 200, 40, '#00f');

    const b = new Tray(400, 400);
    b.drop(100, 200, 30, '#f00');
    const id = b.drop(180, 200, 10, '#00f');
    b.grow(id, 180, 200, 10, 25);
    b.grow(id, 180, 200, 25, 40);

    expect(area(b.drops[0]!.points)).toBeCloseTo(area(a.drops[0]!.points), -1);
    expect(area(b.drops[1]!.points)).toBeCloseTo(area(a.drops[1]!.points), -1);
  });

  it('a needle drags ink near it and leaves far ink alone', () => {
    const tray = new Tray(400, 400);
    tray.drop(100, 100, 20, '#f00');
    tray.drop(300, 300, 20, '#00f');
    const farBefore = [...tray.drops[1]!.points];
    tray.needle(60, 100, 140, 100);
    const near = tray.drops[0]!.points;
    let moved = 0;
    for (let i = 0; i < near.length; i += 2) if (near[i]! > 120) moved++;
    expect(moved).toBeGreaterThan(0);
    const far = tray.drops[1]!.points;
    for (let i = 0; i < farBefore.length; i++) expect(far[i]).toBeCloseTo(farBefore[i]!, 3);
  });

  it('a comb drags ink along several parallel tines', () => {
    const one = new Tray(400, 400);
    const many = new Tray(400, 400);
    for (const tray of [one, many]) tray.drop(200, 200, 60, '#f00');
    one.needle(100, 200, 300, 200);
    many.comb(100, 200, 300, 200, 5, 30);
    const spread = (t: Tray) => {
      const p = t.drops[0]!.points;
      let moved = 0;
      for (let i = 0; i < p.length; i += 2) if (p[i]! > 270) moved++;
      return moved;
    };
    expect(spread(many)).toBeGreaterThan(spread(one));
  });

  it('restores a snapshot exactly, unaffected by later changes', () => {
    const tray = new Tray(200, 200);
    tray.drop(100, 100, 20, '#f00');
    const snap = tray.snapshot();
    tray.needle(80, 100, 120, 100);
    tray.drop(60, 60, 10, '#0f0');
    tray.restore(snap);
    expect(tray.drops).toEqual(snap);
    tray.needle(80, 100, 120, 100);
    expect(tray.drops[0]!.points).not.toEqual(snap[0]!.points);
  });

  it('bumps its version on every change', () => {
    const tray = new Tray(100, 100);
    const v0 = tray.version;
    tray.drop(50, 50, 10, '#000');
    tray.needle(0, 0, 10, 10);
    tray.clear();
    expect(tray.version).toBe(v0 + 3);
  });

  it('forgets ink hidden under a drop that covers the whole tray', () => {
    const tray = new Tray(100, 100);
    tray.drop(50, 50, 10, '#f00');
    tray.drop(50, 50, 10, '#0f0');
    // A huge drop pushes both older ones far beyond the edges.
    tray.drop(50, 50, 200, '#00f');
    tray.drop(50, 50, 5, '#fff');
    expect(tray.drops.length).toBeLessThan(4);
    expect(tray.drops.at(-1)!.color).toBe('#fff');
  });
});

describe('geometry helpers', () => {
  it('resample inserts points into long gaps', () => {
    const square = [0, 0, 50, 0, 50, 50, 0, 50];
    expect(resample(square, true).length).toBeGreaterThan(square.length * 4);
    expect(resample(square, false)).toEqual(square);
  });

  it('coversRect knows a ring around the tray from one beside it', () => {
    expect(coversRect(circle(50, 50, 200), 100, 100)).toBe(true);
    expect(coversRect(circle(500, 500, 20), 100, 100)).toBe(false);
    expect(coversRect(circle(50, 50, 20), 100, 100)).toBe(false);
  });
});
