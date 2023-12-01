import { describe, it, expect } from 'vitest';
import { splitIntoSentencesAst } from './splitSentences';

describe('splitIntoSentencesAst', () => {
    it('should handle enumerations', () => {
        const result = splitIntoSentencesAst('1. This is an enumeration. 2. With two sentences.');
        expect(result).toEqual([
            {
                content: "1. This is an enumeration.",
                offset: 0
            },
            {
                content: "2. With two sentences.",
                offset: 27
            }
        ]);
    });
    it('should not split numbers', () => {
        const result = splitIntoSentencesAst('The temperature is 42.7 degrees. Heute ist der 1. Dezember.');
        expect(result).toEqual([
            {
                content: "The temperature is 42.7 degrees.",
                offset: 0
            },
            {
                content: "Heute ist der 1. Dezember.",
                offset: 33
            }
        ]);
    });
    it('should handle heading enumerations', () => {
        const result = splitIntoSentencesAst('1. **Dezember**\n\n2. **Dezember**');
        expect(result).toEqual([
            {
                content: "1. **Dezember**",
                offset: 0
            },
            {
                content: "2. **Dezember**",
                offset: 17
            }
        ]);
    });
});