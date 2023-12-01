import {split} from "sentence-splitter"

export function splitIntoSentences(text: string, separators: string[], minLength: number): string[] {
  const sentences: string[] = [];
  let startIdx = 0;
  
  for (let i = 0; i < text.length; i++) {
    if (separators.includes(text[i])) {
      if (i - startIdx >= minLength) {
        sentences.push(text.slice(startIdx, i + 1));
        startIdx = i + 1;
      }
    }
  }
  
  if (startIdx < text.length) {
    sentences.push(text.slice(startIdx));
  }
  
  return sentences;
}

export type Sentence = {
  content: string;
  offset: number;
}

const options = {
  SeparatorParser: {
    separatorCharacters: [
      ".", // period
      "．", // (ja) zenkaku-period
      "。", // (ja) 句点
      "?", // question mark
      "!", //  exclamation mark
      "？", // (ja) zenkaku question mark
      "！", // (ja) zenkaku exclamation mark
      "\n"
    ]
  }
};

export function splitIntoSentencesAst(text: string): Sentence[] {
  const result = split(text, options);
  return result
    .filter(node => node.type === "Sentence")
    .map(node => {
      return {
        content: node.raw,
        offset: node.range[0]
      };
    });
}