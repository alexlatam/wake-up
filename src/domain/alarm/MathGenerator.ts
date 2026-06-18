import type { MathLevel } from './Action';

export type MathProblem = { question: string; answer: number };

type RNG = () => number; // returns [0, 1)

function randInt(min: number, max: number, rng: RNG): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[], rng: RNG): T {
  return arr[Math.floor(rng() * arr.length)];
}

function minimo(rng: RNG): MathProblem {
  const a = randInt(1, 9, rng);
  const b = randInt(1, 9, rng);
  if (rng() < 0.5) {
    return { question: `${a} + ${b}`, answer: a + b };
  }
  const [big, small] = a >= b ? [a, b] : [b, a];
  return { question: `${big} - ${small}`, answer: big - small };
}

function medio(rng: RNG): MathProblem {
  const op = pick(['+', '-', '×'] as const, rng);
  if (op === '×') {
    const a = randInt(2, 12, rng);
    const b = randInt(2, 12, rng);
    return { question: `${a} × ${b}`, answer: a * b };
  }
  const a = randInt(10, 99, rng);
  const b = randInt(10, 99, rng);
  if (op === '+') return { question: `${a} + ${b}`, answer: a + b };
  const [big, small] = a >= b ? [a, b] : [b, a];
  return { question: `${big} - ${small}`, answer: big - small };
}

function maximo(rng: RNG): MathProblem {
  if (rng() < 0.5) {
    const a = randInt(10, 99, rng);
    const b = randInt(2, 9, rng);
    return { question: `${a} × ${b}`, answer: a * b };
  }
  const result = randInt(2, 12, rng);
  const divisor = randInt(2, 9, rng);
  return { question: `${result * divisor} ÷ ${divisor}`, answer: result };
}

function extremo(rng: RNG): MathProblem {
  const a = randInt(2, 15, rng);
  const b = randInt(2, 9, rng);
  const c = randInt(2, 9, rng);
  if (rng() < 0.5) {
    return { question: `${a} + ${b} × ${c}`, answer: a + b * c };
  }
  return { question: `${a} × ${b} + ${c}`, answer: a * b + c };
}

export function generateMath(level: MathLevel, rng: RNG = Math.random): MathProblem {
  switch (level) {
    case 'MINIMO': return minimo(rng);
    case 'MEDIO':  return medio(rng);
    case 'MAXIMO': return maximo(rng);
    case 'EXTREMO': return extremo(rng);
  }
}
