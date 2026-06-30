import fs from "fs";

const history: string[] = [];
let lastAppendedIndex = 0; // tracks how many entries have already been appended to a file

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
    lastAppendedIndex = history.length; // loaded entries are already "in" the file
  } catch (err: any) {
    console.log(`history: ${path}: ${err.message}`);
  }
}

export function writeHistoryToFile(path: string): void {
  try {
    const content = history.join("\n") + (history.length > 0 ? "\n" : "");
    fs.writeFileSync(path, content);
    lastAppendedIndex = history.length; // a full write also resets the append point
  } catch (err: any) {
    console.log(`history: ${path}: ${err.message}`);
  }
}

export function appendHistoryToFile(path: string): void {
  try {
    const newEntries = history.slice(lastAppendedIndex);
    if (newEntries.length === 0) return;

    const content = newEntries.join("\n") + "\n";
    fs.appendFileSync(path, content);
    lastAppendedIndex = history.length;
  } catch (err: any) {
    console.log(`history: ${path}: ${err.message}`);
  }
}