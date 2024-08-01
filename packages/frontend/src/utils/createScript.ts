
export function createScript(src: string, onLoadCallback: () => void): HTMLScriptElement {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.defer = true;
  script.onload = onLoadCallback;
  return script;
}
