import type { MathLevel } from './Action';

export type MathProblem = { question: string; answer: number };

type RNG = () => number;

function randInt(min: number, max: number, rng: RNG): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[], rng: RNG): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Easy: sum or subtraction of two numbers, each max 2 digits
function minimo(rng: RNG): MathProblem {
  const a = randInt(10, 99, rng);
  const b = randInt(10, 99, rng);
  if (rng() < 0.5) {
    return { question: `${a} + ${b}`, answer: a + b };
  }
  const [big, small] = a >= b ? [a, b] : [b, a];
  return { question: `${big} − ${small}`, answer: big - small };
}

// Medium: multiplication or division of two 2-digit numbers, integer result
function medio(rng: RNG): MathProblem {
  if (rng() < 0.5) {
    const a = randInt(10, 99, rng);
    const b = randInt(10, 99, rng);
    return { question: `${a} × ${b}`, answer: a * b };
  }
  for (let i = 0; i < 30; i++) {
    const b = randInt(10, 49, rng);
    const maxQ = Math.floor(99 / b);
    if (maxQ < 2) continue;
    const q = randInt(2, maxQ, rng);
    const a = b * q;
    if (a >= 10 && a <= 99) {
      return { question: `${a} ÷ ${b}`, answer: q };
    }
  }
  return { question: `96 ÷ 12`, answer: 8 };
}

// Maximum: multiplication of three 3-digit numbers
function maximo(rng: RNG): MathProblem {
  const a = randInt(100, 999, rng);
  const b = randInt(100, 999, rng);
  const c = randInt(100, 999, rng);
  return { question: `${a} × ${b} × ${c}`, answer: a * b * c };
}

const PERFECT_SQUARES = [4, 9, 16, 25, 36, 49, 64, 81] as const;

// Extreme: √a × b ÷ c + d − e  (standard precedence: mult/div before add/sub)
// All numbers ≤ 2 digits, result always a positive integer
function extremo(rng: RNG): MathProblem {
  for (let attempt = 0; attempt < 100; attempt++) {
    const a = pick(PERFECT_SQUARES, rng);
    const r = Math.round(Math.sqrt(a)); // 2–9
    const b = randInt(2, 9, rng);
    const rb = r * b; // 4–81

    const divisors: number[] = [];
    for (let i = 2; i <= Math.min(rb - 1, 9); i++) {
      if (rb % i === 0) divisors.push(i);
    }
    if (divisors.length === 0) continue;

    const c = pick(divisors, rng);
    const intermediate = rb / c; // positive integer

    const d = randInt(2, 50, rng);
    const maxE = Math.min(intermediate + d - 1, 99);
    if (maxE < 1) continue;
    const e = randInt(1, maxE, rng);

    const result = intermediate + d - e;
    if (result > 0) {
      return { question: `√${a} × ${b} ÷ ${c} + ${d} − ${e}`, answer: result };
    }
  }
  // √16 × 3 ÷ 2 + 10 − 4 = 6 + 10 − 4 = 12
  return { question: `√16 × 3 ÷ 2 + 10 − 4`, answer: 12 };
}

export function generateMath(level: MathLevel, rng: RNG = Math.random): MathProblem {
  switch (level) {
    case 'EASY':  return minimo(rng);
    case 'MEDIUM':   return medio(rng);
    case 'MAXIMUM':  return maximo(rng);
    case 'EXTREME': return extremo(rng);
  }
}
