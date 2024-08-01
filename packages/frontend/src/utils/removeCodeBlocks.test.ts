import { describe, it, expect } from 'vitest';
import { removeCodeBlocks } from './removeCodeBlocks';

describe('removeCodeBlocks', () => {
    it('should handle no code blocks', () => {
        const result = removeCodeBlocks('This is a text.');
        expect(result).toEqual('This is a text.');
    });
    it('should handle inline code spans', () => {
        const result = removeCodeBlocks('This is a text with `inline` code.');
        expect(result).toEqual('This is a text with `inline` code.');
    });
    it('should handle open code blocks', () => {
        const result = removeCodeBlocks('Here is some example code:\n\n```javascript\nconst a = 1;\n');
        expect(result).toEqual('Here is some example code:\n\n');
    });
    it('should handle single code blocks', () => {
        const result = removeCodeBlocks('Here is some example code:\n\n```javascript\nconst a = 1;\nconst b = 2;\nconst c = a + b;\n```\n\nThis is a text with `inline` code.');
        expect(result).toEqual('Here is some example code:\n\n\n\nThis is a text with `inline` code.');
    });
    it('should handle alternating code blocks', () => {
        const result = removeCodeBlocks('Here is some example code:\n\n```javascript\nconst a = 1;\nconst b = 2;\nconst c = a + b;\n```\n\nAnd this is another example:\n\n```javascript\nconst a = 1;\nconst b = 2;\n');
        expect(result).toEqual('Here is some example code:\n\n\n\nAnd this is another example:\n\n');
    });
});