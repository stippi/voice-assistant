export function removeCodeBlocks(text: string): string {
  // Regular expression matching ``` blocks
  // Searches an opening ```, followed by any characters (including line breaks), followed by a closing ```
  // The pattern `[\s\S]*?` matches any characters including line breaks (non-greedy)
  // The final `|[\s\S]*` matches everything from the last opening ``` to the end, if no closing ``` exists
  const regex = /```[\s\S]*?```|```[\s\S]*/g;
  
  // Remove all matches
  return text.replace(regex, '');
}