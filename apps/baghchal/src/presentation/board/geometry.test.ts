import { nodePosition } from './geometry';

describe('nodePosition', () => {
  it('spreads the grid evenly between the insets', () => {
    expect(nodePosition(0, 400, 40)).toEqual({ x: 40, y: 40 });
    expect(nodePosition(24, 400, 40)).toEqual({ x: 360, y: 360 });
    expect(nodePosition(12, 400, 40)).toEqual({ x: 200, y: 200 });
    expect(nodePosition(7, 400, 40)).toEqual({ x: 200, y: 120 });
  });
});
