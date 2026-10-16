import { en, funKey } from './en';

describe('English resource', () => {
  it('has a short, family-friendly rhyme for every number', () => {
    for (let n = 1; n <= 90; n++) {
      const rhyme = en.fun[`n${n}` as keyof typeof en.fun];
      expect(typeof rhyme).toBe('string');
      expect(rhyme.length).toBeGreaterThan(2);
      expect(rhyme.length).toBeLessThanOrEqual(28);
    }
    expect(Object.keys(en.fun)).toHaveLength(90);
  });

  it('keeps the classics', () => {
    expect(en.fun.n1).toBe('Kelly’s eye');
    expect(en.fun.n11).toBe('Legs eleven');
    expect(en.fun.n22).toBe('Two little ducks');
    expect(en.fun.n88).toBe('Two big doughnuts');
    expect(en.fun.n90).toBe('Top of the shop');
  });

  it('builds rhyme keys', () => {
    expect(funKey(22)).toBe('fun.n22');
    expect(funKey(0)).toBe('fun.n1');
  });

  it('never puts a dot inside a key segment', () => {
    const walk = (o: object, path: string) => {
      for (const [k, v] of Object.entries(o)) {
        expect(k.includes('.')).toBe(false);
        if (v && typeof v === 'object') walk(v, `${path}.${k}`);
      }
    };
    walk(en, '');
  });
});
