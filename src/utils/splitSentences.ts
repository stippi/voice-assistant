export default function splitIntoSentences(text: string, separators: string[], minLength: number): string[] {
  let sentences: string[] = [];
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