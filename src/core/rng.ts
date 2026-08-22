/**
 * Deterministic RNG.
 *
 * Battles, encounters and capture rolls all run through a seeded generator so
 * that a bug can be reproduced from a seed, and so tests are stable.
 */

export class Rng {
  private s0 = 0;
  private s1 = 0;
  private s2 = 0;
  private s3 = 0;

  constructor(seed: number | string = Date.now()) {
    this.reseed(seed);
  }

  reseed(seed: number | string): void {
    let h = 0x9e3779b9;
    const str = typeof seed === 'number' ? String(seed >>> 0) : seed;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x85ebca6b);
      h = (h ^ (h >>> 13)) >>> 0;
    }
    // splitmix32 to fill the xoshiro state
    const next = () => {
      h = (h + 0x9e3779b9) >>> 0;
      let z = h;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
      return (z ^ (z >>> 15)) >>> 0;
    };
    this.s0 = next();
    this.s1 = next();
    this.s2 = next();
    this.s3 = next();
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 1;
  }

  /** Raw 32-bit unsigned value (xoshiro128**). */
  nextUint32(): number {
    const r = Math.imul(this.s1, 5) >>> 0;
    const result = Math.imul((r << 7) | (r >>> 25), 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = ((this.s3 << 11) | (this.s3 >>> 21)) >>> 0;
    this.s0 >>>= 0; this.s1 >>>= 0; this.s2 >>>= 0; this.s3 >>>= 0;
    return result;
  }

  /** Float in [0, 1). */
  next(): number {
    return this.nextUint32() / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Integer in [0, n). */
  below(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** True with probability `percent`/100. */
  chance(percent: number): boolean {
    if (percent <= 0) return false;
    if (percent >= 100) return true;
    return this.next() * 100 < percent;
  }

  /** True with probability num/den. */
  odds(num: number, den: number): boolean {
    return this.next() * den < num;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.below(arr.length)]!;
  }

  /** Weighted pick. Weights need not sum to anything in particular. */
  pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
    let total = 0;
    for (const it of items) total += Math.max(0, weightOf(it));
    if (total <= 0) return items[0]!;
    let roll = this.next() * total;
    for (const it of items) {
      roll -= Math.max(0, weightOf(it));
      if (roll < 0) return it;
    }
    return items[items.length - 1]!;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.below(i + 1);
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  }

  /** Snapshot for saving mid-battle state. */
  getState(): [number, number, number, number] {
    return [this.s0, this.s1, this.s2, this.s3];
  }

  setState(state: [number, number, number, number]): void {
    [this.s0, this.s1, this.s2, this.s3] = state;
  }
}

/** Shared world RNG. Battles create their own so replays stay isolated. */
export const worldRng = new Rng();
