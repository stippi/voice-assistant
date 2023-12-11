import { describe, it, expect } from 'vitest';
import {splitIntoSentencesAst, trimNonLetters, textToLowerCaseWords} from './textUtils';

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
        const result = splitIntoSentencesAst('\n1. **Dezember**\n\n2. **Dezember**\n');
        expect(result).toEqual([
            {
                content: "1. **Dezember**",
                offset: 1
            },
            {
                content: "2. **Dezember**",
                offset: 18
            }
        ]);
    });
});

describe('trimNonLetters', () => {
    it('should trim non-letters', () => {
        const result = trimNonLetters('1. This is an enumeration. 2. With two sentences.');
        expect(result).toEqual("This is an enumeration. 2. With two sentences");
    });
    it('should not trim letters', () => {
        const result = trimNonLetters('A few words');
        expect(result).toEqual("A few words");
    });
    it('should trim from start', () => {
        const result = trimNonLetters('- bullet point');
        expect(result).toEqual("bullet point");
    });
    it('should trim from end', () => {
        const result = trimNonLetters('This is a sentence!!');
        expect(result).toEqual("This is a sentence");
    });
    it('should result in an empty string', () => {
        const result = trimNonLetters('1234!!');
        expect(result).toEqual("");
    });
});

describe('textToLowerCaseWords', () => {
    it('should split and keep just words', () => {
        const result = textToLowerCaseWords('1. This is an enumeration. 2. With two sentences.');
        expect(result).toEqual(["this", "is", "an", "enumeration", "with", "two", "sentences"]);
    });
    it('should keep a single word', () => {
        const result = textToLowerCaseWords('word');
        expect(result).toEqual(["word"]);
    });
    it('should result in an empty array', () => {
        const result = textToLowerCaseWords('123 456');
        expect(result).toEqual([]);
    });
});