/**
 * Abstraction over randomness. The domain never calls Math.random() or any
 * concrete RNG directly — production wires a cryptographically secure
 * implementation (infrastructure/random), tests wire a deterministic fake.
 */
export interface IRandomProvider {
  /** Returns an integer in [minInclusive, maxInclusive]. */
  nextInt(minInclusive: number, maxInclusive: number): Promise<number>;
}
