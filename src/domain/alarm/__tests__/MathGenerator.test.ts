import { generateMath } from '../MathGenerator';

// Seeded RNG for deterministic tests
function makeRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('generateMath', () => {
  describe('MINIMO', () => {
    it('produces addition when rng < 0.5', () => {
      // a=3, b=5, op=add (rng=0.4)
      const rng = makeRng([0.2, 0.4, 0.4]);
      const { question, answer } = generateMath('MINIMO', rng);
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(question).toContain('+');
    });

    it('produces subtraction with non-negative result', () => {
      const rng = makeRng([0.8, 0.1, 0.9]); // a=8, b=1, op=sub
      const { question, answer } = generateMath('MINIMO', rng);
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(question).toContain('-');
    });

    it('answer matches evaluated question for addition', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MINIMO');
        if (question.includes('+')) {
          const [a, b] = question.split(' + ').map(Number);
          expect(answer).toBe(a + b);
        }
      }
    });

    it('answer matches evaluated question for subtraction', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MINIMO');
        if (question.includes('-')) {
          const [a, b] = question.split(' - ').map(Number);
          expect(answer).toBe(a - b);
          expect(answer).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('MEDIO', () => {
    it('produces correct multiplication answer', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MEDIO');
        if (question.includes('×')) {
          const [a, b] = question.split(' × ').map(Number);
          expect(answer).toBe(a * b);
        }
      }
    });

    it('subtraction result is non-negative', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MEDIO');
        if (question.includes('-')) {
          expect(answer).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('MAXIMO', () => {
    it('division result is an integer', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MAXIMO');
        if (question.includes('÷')) {
          const [dividend, divisor] = question.split(' ÷ ').map(Number);
          expect(dividend % divisor).toBe(0);
          expect(answer).toBe(dividend / divisor);
        }
      }
    });

    it('multiplication result matches', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MAXIMO');
        if (question.includes('×')) {
          const [a, b] = question.split(' × ').map(Number);
          expect(answer).toBe(a * b);
        }
      }
    });
  });

  describe('EXTREMO', () => {
    it('respects operator precedence', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('EXTREMO');
        const addIdx = question.indexOf('+');
        const mulIdx = question.indexOf('×');
        if (addIdx < mulIdx) {
          // pattern: a + b × c
          const [a, rest] = question.split(' + ');
          const [b, c] = rest.split(' × ').map(Number);
          expect(answer).toBe(Number(a) + b * c);
        } else {
          // pattern: a × b + c
          const [left, c] = question.split(' + ');
          const [a, b] = left.split(' × ').map(Number);
          expect(answer).toBe(a * b + Number(c));
        }
      }
    });

    it('always produces a positive answer', () => {
      for (let i = 0; i < 100; i++) {
        const { answer } = generateMath('EXTREMO');
        expect(answer).toBeGreaterThan(0);
      }
    });
  });
});
