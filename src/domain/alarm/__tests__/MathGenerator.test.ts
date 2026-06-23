import { generateMath } from '../MathGenerator';

// Seeded RNG for deterministic tests
function makeRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('generateMath', () => {
  describe('EASY', () => {
    it('produces addition when rng < 0.5', () => {
      // a=3, b=5, op=add (rng=0.4)
      const rng = makeRng([0.2, 0.4, 0.4]);
      const { question, answer } = generateMath('EASY', rng);
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(question).toContain('+');
    });

    it('produces subtraction with non-negative result', () => {
      const rng = makeRng([0.8, 0.1, 0.9]); // a=8, b=1, op=sub
      const { question, answer } = generateMath('EASY', rng);
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(question).toContain('−'); // U+2212 MINUS SIGN (not ASCII hyphen)
    });

    it('answer matches evaluated question for addition', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('EASY');
        if (question.includes('+')) {
          const [a, b] = question.split(' + ').map(Number);
          expect(answer).toBe(a + b);
        }
      }
    });

    it('answer matches evaluated question for subtraction', () => {
      // Code emits U+2212 MINUS SIGN (−), not ASCII hyphen (-)
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('EASY');
        if (question.includes('−')) { // U+2212
          const [a, b] = question.split(' − ').map(Number); // U+2212
          expect(answer).toBe(a - b);
          expect(answer).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('MEDIUM', () => {
    it('produces correct multiplication answer', () => {
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MEDIUM');
        if (question.includes('×')) {
          const [a, b] = question.split(' × ').map(Number);
          expect(answer).toBe(a * b);
        }
      }
    });

    it('division result is an integer and matches', () => {
      // MEDIUM produces division (÷), not subtraction
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MEDIUM');
        if (question.includes('÷')) {
          const [dividend, divisor] = question.split(' ÷ ').map(Number);
          expect(dividend % divisor).toBe(0);
          expect(answer).toBe(dividend / divisor);
        }
      }
    });
  });

  describe('MAXIMUM', () => {
    it('MAXIMUM always produces three-operand multiplication (never division)', () => {
      // maximo() = a × b × c — never produces ÷
      for (let i = 0; i < 50; i++) {
        const { question } = generateMath('MAXIMUM');
        expect(question).toContain('×');
        expect(question).not.toContain('÷');
      }
    });

    it('multiplication result matches across all three operands', () => {
      // question format: "a × b × c", answer = a * b * c
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('MAXIMUM');
        if (question.includes('×')) {
          const parts = question.split(' × ').map(Number);
          const expected = parts.reduce((acc, n) => acc * n, 1);
          expect(answer).toBe(expected);
        }
      }
    });
  });

  describe('EXTREME', () => {
    it('answer equals √A × B ÷ C + D − E evaluated with standard precedence', () => {
      // Format is always: √A × B ÷ C + D − E
      // Precedence: (√A × B ÷ C) + D − E  (left-to-right within each tier)
      // Note: − is U+2212 MINUS SIGN, × is U+00D7, ÷ is U+00F7
      for (let i = 0; i < 50; i++) {
        const { question, answer } = generateMath('EXTREME');
        const m = question.match(/^√(\d+) × (\d+) ÷ (\d+) \+ (\d+) − (\d+)$/);
        expect(m).not.toBeNull();
        if (m) {
          const [, a, b, c, d, e] = m.map(Number);
          const intermediate = (Math.sqrt(a) * b) / c;
          expect(answer).toBe(intermediate + d - e);
        }
      }
    });

    it('always produces a positive answer', () => {
      for (let i = 0; i < 100; i++) {
        const { answer } = generateMath('EXTREME');
        expect(answer).toBeGreaterThan(0);
      }
    });
  });

  describe('invalid level', () => {
    it('throws for unrecognised level (runtime bypass of TypeScript types)', () => {
      // @ts-expect-error intentionally bypassing MathLevel type
      expect(() => generateMath('INVALID_LEVEL')).toThrow('Unknown MathLevel');
    });
  });
});
