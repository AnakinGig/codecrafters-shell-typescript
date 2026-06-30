const history: string[] = [];

export function addToHistory(line: string): void {
  if (line.trim() === "") return; // bash doesn't record empty lines
  history.push(line);
}

export function getHistory(): string[] {
  return history;
}