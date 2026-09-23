import * as Crypto from 'expo-crypto';
import { SecureRandomProvider } from './SecureRandomProvider';

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
}));

const getRandomBytesAsync = Crypto.getRandomBytesAsync as jest.Mock;

describe('SecureRandomProvider', () => {
  beforeEach(() => {
    getRandomBytesAsync.mockReset();
  });

  it('maps a byte into the requested range', async () => {
    getRandomBytesAsync.mockResolvedValueOnce(new Uint8Array([3])); // 3 % 6 = 3 -> die value 4
    const provider = new SecureRandomProvider();

    await expect(provider.nextInt(1, 6)).resolves.toBe(4);
  });

  it('rejects and re-draws a biased byte instead of using modulo directly', async () => {
    // For range 6, acceptanceLimit = 256 - (256 % 6) = 252. Byte 255 must be rejected.
    getRandomBytesAsync
      .mockResolvedValueOnce(new Uint8Array([255]))
      .mockResolvedValueOnce(new Uint8Array([0]));
    const provider = new SecureRandomProvider();

    await expect(provider.nextInt(1, 6)).resolves.toBe(1);
    expect(getRandomBytesAsync).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid range', async () => {
    const provider = new SecureRandomProvider();
    await expect(provider.nextInt(6, 1)).rejects.toThrow();
  });
});
