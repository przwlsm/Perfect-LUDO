import { parseInviteCode } from './invite';

describe('parseInviteCode', () => {
  it.each([
    ['ABC234', 'ABC234'],
    ['abc234', 'ABC234'],
    [' abc-234 ', 'ABC234'],
    ['perfectludo://join/XYZ789', 'XYZ789'],
    ['Join my Ludo Rumble game! Tap perfectludo://join/HJK456 to sit down.', 'HJK456'],
  ])('reads %p as %p', (raw, code) => {
    expect(parseInviteCode(raw)).toBe(code);
  });
  it.each(['', 'ABC23', 'ABC2345', 'ABCO23', 'ABC123', 'hello world'])('rejects %p', (raw) => {
    expect(parseInviteCode(raw)).toBeNull();
  });
});
