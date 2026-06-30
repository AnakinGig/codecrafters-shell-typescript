import fs from "fs";

import { getExecutablesInPath } from "../utils/path";
import { builtins } from "../builtins";
import { rl } from "../index";

let lastCompletionLine: string | null = null;

function getLastWord(line: string): { prefix: string; word: string } {
  const lastSpaceIndex = line.lastIndexOf(" ");
  const prefix = lastSpaceIndex === -1 ? "" : line.slice(0, lastSpaceIndex + 1);
  const word = lastSpaceIndex === -1 ? line : line.slice(lastSpaceIndex + 1);
  return { prefix, word };
}

export function completer(line: string): [string[], string] {
  const { prefix, word } = getLastWord(line);
  const isFirstWord = prefix === "";

  let allMatches: string[] = [];
  let isFileCompletion = false;

  if (isFirstWord) {
    const builtinMatches = Object.keys(builtins).filter(name => name.startsWith(word));
    const pathMatches = getExecutablesInPath(word);
    allMatches = Array.from(new Set([...builtinMatches, ...pathMatches])).sort();
  }

  // Fallback to filesystem completion when no command/executable matches
  // (or directly for non-first words, e.g. arguments)
  if (allMatches.length === 0) {
    const { matches } = getFileMatches(word);
    if (matches.length > 0) {
      allMatches = matches;
      isFileCompletion = true;
    }
  }

  if (allMatches.length === 0) {
    process.stdout.write("\x07"); // bell character
    lastCompletionLine = null;
    return [[], line];
  }

  if (allMatches.length === 1) {
    lastCompletionLine = null;
    const match = allMatches[0];
    const suffix = isFileCompletion && match.endsWith("/") ? "" : " ";
    return [[prefix + match + suffix], line];
  }

  // Multiple matches: try to extend to the longest common prefix
  const commonPrefix = longestCommonPrefix(allMatches);

  if (commonPrefix.length > word.length) {
    lastCompletionLine = null;
    return [[prefix + commonPrefix], line];
  }

  // No further unambiguous extension possible
  if (lastCompletionLine !== line) {
    process.stdout.write("\x07");
    lastCompletionLine = line;
    return [[], line];
  }

  const displayList = isFileCompletion
    ? allMatches.map(m => m.slice(m.lastIndexOf("/") + 1) || m)
    : allMatches;

  process.stdout.write("\n" + displayList.join("  ") + "\n");
  rl.prompt();
  (rl as any).line = line;
  (rl as any)._refreshLine?.();
  lastCompletionLine = null;

  return [[], line];
}

export function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0];

  for (let i = 1; i < strings.length; i++) {
    let j = 0;
    const s = strings[i];
    while (j < prefix.length && j < s.length && prefix[j] === s[j]) {
      j++;
    }
    prefix = prefix.slice(0, j);
    if (prefix === "") break;
  }

  return prefix;
}

export function getFileMatches(prefix: string): { matches: string[]; dir: string; base: string } {
  const lastSlash = prefix.lastIndexOf("/");
  const dir = lastSlash === -1 ? "." : prefix.slice(0, lastSlash + 1);
  const base = lastSlash === -1 ? prefix : prefix.slice(lastSlash + 1);

  let entries: string[];
  try {
    entries = fs.readdirSync(dir === "" ? "." : dir);
  } catch {
    return { matches: [], dir, base };
  }

  const matches: string[] = [];
  for (const entry of entries) {
    if (!entry.startsWith(base)) continue;
    if (entry.startsWith(".") && !base.startsWith(".")) continue;

    const fullPath = (dir === "." ? "" : dir) + entry;
    let isDir = false;
    try {
      isDir = fs.statSync(fullPath).isDirectory();
    } catch {}

    matches.push(dir + entry + (isDir ? "/" : ""));
  }

  return { matches: matches.sort(), dir, base };
}