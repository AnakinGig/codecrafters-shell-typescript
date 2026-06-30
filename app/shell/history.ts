import fs from "fs";

const history: string[] = [];

export function addToHistory(line: string): void {
  if (line.trim() === "") return;
  history.push(line);
}

export function getHistory(): string[] {
  return history;
}

export function loadHistoryFromFile(path: string): void {
  try {
    const content = fs.readFileSync(path, "utf8");
    const lines = content.split("\n").filter(l => l.trim() !== "");
    history.push(...lines);
  } catch (err: any) {
    console.log(`history: ${path}: ${err.message}`);
  }
}