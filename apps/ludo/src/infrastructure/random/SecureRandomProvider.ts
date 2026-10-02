import * as Crypto from 'expo-crypto';
import type { IRandomProvider } from '@/domain';

/**
 * Production IRandomProvider: cryptographically secure bytes from
 * expo-crypto, not Math.random(). Uses rejection sampling rather than a
 * plain modulo so small ranges (like a die's 1-6) aren't modulo-biased.
 */
export class SecureRandomProvider implements IRandomProvider {
  async nextInt(minInclusive: number, maxInclusive: number): Promise<number> {
    const range = maxInclusive - minInclusive + 1;
    if (range <= 0) {
      throw new Error(`Invalid range [${minInclusive}, ${maxInclusive}]`);
    }

    const byteSpace = 256;
    const acceptanceLimit = byteSpace - (byteSpace % range);

    let byte: number;
    do {
      const bytes = await Crypto.getRandomBytesAsync(1);
      byte = bytes[0]!;
    } while (byte >= acceptanceLimit);

    return minInclusive + (byte % range);
  }
}
