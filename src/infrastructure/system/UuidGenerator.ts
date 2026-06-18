import type { IdGenerator } from '../../domain/ports/IdGenerator';

export class UuidGenerator implements IdGenerator {
  generate(): string {
    // Uses the Web Crypto API available in both React Native (Hermes) and Node.js
    return crypto.randomUUID();
  }
}
