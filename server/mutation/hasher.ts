/**
 * SyntaXViva Core V1 — Part 3 Hashing & Deterministic Seed Utilities
 *
 * Implements cryptographic SHA-256 source hashing to guarantee code integrity,
 * and a deterministic PRNG to ensure reproducible mutation selection.
 */

import crypto from 'crypto';

/**
 * Computes a standard hex SHA-256 hash for a given code string.
 */
export function computeCodeHash(code: string): string {
  return crypto.createHash('sha256').update(code, 'utf8').digest('hex');
}

/**
 * Generates a deterministic or pseudorandom seed.
 * If seedHint is provided (e.g., attempt ID or combined source), it derives a consistent hex seed.
 */
export function createSeed(seedHint?: string): string {
  if (seedHint && seedHint.trim().length > 0) {
    return crypto.createHash('sha256').update(seedHint).digest('hex').substring(0, 16);
  }
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Mulberry32 deterministic 32-bit PRNG.
 * Given a seed string or number, returns a function that generates numbers in [0, 1).
 */
export function createDeterministicRNG(seed: string | number): () => number {
  let seedNum: number;
  if (typeof seed === 'string') {
    // Hash the string to a 32-bit integer
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    }
    seedNum = h >>> 0;
  } else {
    seedNum = seed >>> 0;
  }

  return function next(): number {
    seedNum = (seedNum + 0x6d2b79f5) | 0;
    let t = Math.imul(seedNum ^ (seedNum >>> 15), 1 | seedNum);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
