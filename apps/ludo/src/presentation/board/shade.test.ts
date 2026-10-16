import { shade } from './shade';

describe('shade', () => {
  it('darkens toward black and lightens toward white', () => {
    expect(shade('#808080', -1)).toBe('#000000');
    expect(shade('#808080', 1)).toBe('#ffffff');
    expect(shade('#808080', -0.5)).toBe('#404040');
    expect(shade('#000000', 0.5)).toBe('#808080');
  });

  it('leaves a colour alone at zero and passes through anything it cannot parse', () => {
    expect(shade('#c8a24d', 0)).toBe('#c8a24d');
    expect(shade('rgba(0,0,0,0.5)', -0.3)).toBe('rgba(0,0,0,0.5)');
  });

  it('ignores a trailing alpha byte rather than mangling the colour', () => {
    expect(shade('#ffc56840', -1)).toBe('#000000');
  });
});
