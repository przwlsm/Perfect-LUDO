import type { IRandomProvider } from '../ports/IRandomProvider';

/**
 * Deterministic IRandomProvider test double: returns a pre-queued sequence
 * of values instead of real randomness, so tests can script an exact dice
 * sequence. Lives next to the port it fakes rather than in a generic test
 * utils grab-bag.
 */
export class QueuedRandomProvider implements IRandomProvider {
  private readonly queue: number[];

  constructor(values: readonly number[]) {
    this.queue = [...values];
  }

  async nextInt(minInclusive: number, maxInclusive: number): Promise<number> {
    const value = this.queue.shift();
    if (value === undefined) {
      throw new Error('QueuedRandomProvider ran out of queued values');
    }
    if (value < minInclusive || value > maxInclusive) {
      throw new Error(`Queued value ${value} out of range [${minInclusive}, ${maxInclusive}]`);
    }
    return value;
  }
}
