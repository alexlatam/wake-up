import { getRandomPhrase, getCustomPhrase } from '../TextPhrases';

// Mirror the PHRASES sizes from TextPhrases.ts so we can assert membership
// without importing the private constant.
const PHRASE_COUNTS = { EASY: 10, MEDIUM: 10, MAXIMUM: 5 } as const;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getRandomPhrase', () => {
  it('returns a non-empty string for EASY', () => {
    const phrase = getRandomPhrase('EASY');
    expect(typeof phrase).toBe('string');
    expect(phrase.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for MEDIUM', () => {
    expect(getRandomPhrase('MEDIUM').length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for MAXIMUM', () => {
    expect(getRandomPhrase('MAXIMUM').length).toBeGreaterThan(0);
  });

  it('EASY: stubbed random index 0 returns first phrase', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const phrase = getRandomPhrase('EASY');
    expect(phrase).toBe('The sun is shining today.');
  });

  it('MEDIUM: stubbed random index 0 returns first phrase', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const phrase = getRandomPhrase('MEDIUM');
    expect(phrase).toContain('Wake up and face the world.');
  });

  it('MAXIMUM: stubbed random index 0 returns first phrase', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const phrase = getRandomPhrase('MAXIMUM');
    expect(phrase).toContain('Every morning is a chance');
  });

  it('EASY: stubbed random selects last item (index = count - 1)', () => {
    // Math.floor(0.999... * 10) = 9 → index 9
    jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    const phrase = getRandomPhrase('EASY');
    expect(phrase).toBe('Rise up, it is morning.');
  });

  it('result is always a member of the level phrase list (property test)', () => {
    const easyPhrases = [
      'The sun is shining today.',
      'I am ready to wake up.',
      'Good morning, a new day begins.',
      'Time to rise and shine.',
      'A new day has begun.',
      'Open your eyes and breathe.',
      'Get up and start moving.',
      'Today is going to be great.',
      'Wake up and be awesome.',
      'Rise up, it is morning.',
    ];
    for (let i = 0; i < 30; i++) {
      expect(easyPhrases).toContain(getRandomPhrase('EASY'));
    }
  });

  it('MAXIMUM phrase is always longer than EASY phrase (paragraph vs sentence)', () => {
    // Smoke-test: MAXIMUM is always significantly longer than EASY
    for (let i = 0; i < 10; i++) {
      const easy = getRandomPhrase('EASY');
      const max = getRandomPhrase('MAXIMUM');
      expect(max.length).toBeGreaterThan(easy.length * 3);
    }
  });

  it('throws TypeError when called with CUSTOM (level excluded from PHRASES)', () => {
    // @ts-expect-error intentionally passing excluded level
    expect(() => getRandomPhrase('CUSTOM')).toThrow(TypeError);
  });

  it('throws TypeError for a completely unknown level', () => {
    // @ts-expect-error intentionally passing unknown level
    expect(() => getRandomPhrase('NONSENSE')).toThrow(TypeError);
  });
});

describe('getCustomPhrase', () => {
  it('returns a non-empty string for any word count', () => {
    expect(getCustomPhrase(5).length).toBeGreaterThan(0);
    expect(getCustomPhrase(20).length).toBeGreaterThan(0);
  });

  it('wordCount = 0: returns at least one sentence (loop breaks immediately after first)', () => {
    // With wordCount=0, after the first sentence: wc >= 0 is true and result is non-empty
    const phrase = getCustomPhrase(0);
    expect(phrase.length).toBeGreaterThan(0);
    // Should be a single sentence (not the whole pool)
    // Count sentences: split on '. ' — should be small
    const sentences = phrase.split('. ').length;
    expect(sentences).toBeLessThanOrEqual(3); // one or very few sentences
  });

  it('negative wordCount: returns at least one sentence (wc from first sentence >= negative)', () => {
    const phrase = getCustomPhrase(-100);
    expect(phrase.length).toBeGreaterThan(0);
  });

  it('huge wordCount > total pool words: exhausts pool, returns all sentences, no infinite loop', () => {
    // The pool has ~40 sentences (10 EASY + 30 from MEDIUM). At ~10 words each = ~400 words.
    // Requesting 10000 words should exhaust the pool and return without hanging.
    const phrase = getCustomPhrase(10000);
    expect(phrase.length).toBeGreaterThan(0);
    // Result should contain content from multiple sentences
    expect(phrase.split(' ').length).toBeGreaterThan(10);
  });

  it('fractional wordCount works via >= comparison', () => {
    const phrase = getCustomPhrase(5.7);
    expect(phrase.length).toBeGreaterThan(0);
  });

  it('result always ends with a period', () => {
    for (let wc = 0; wc <= 30; wc += 5) {
      const phrase = getCustomPhrase(wc);
      expect(phrase.endsWith('.')).toBe(true);
    }
  });

  it('requesting more words yields a longer result than fewer words', () => {
    // Non-deterministic but statistically reliable: median(30) > median(5)
    let short = 0;
    let long = 0;
    for (let i = 0; i < 20; i++) {
      short += getCustomPhrase(5).split(' ').length;
      long += getCustomPhrase(50).split(' ').length;
    }
    expect(long / 20).toBeGreaterThan(short / 20);
  });

  it('deterministic output given a stubbed Math.random that returns 0 (no shuffle)', () => {
    // With Math.random always returning 0, Fisher-Yates never swaps (j always = 0...
    // Actually j = floor(0 * (i+1)) = 0 each time, so pool[i] swaps with pool[0] each iter.
    // The exact output is deterministic — verify it's consistent across two calls.
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const first = getCustomPhrase(5);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const second = getCustomPhrase(5);
    expect(first).toBe(second);
  });
});
