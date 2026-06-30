import fs from "fs";

import { getExecutablesInPath } from "../utils/path";
import { builtins } from "../builtins";
import { rl } from "../index";

let lastCompletionLine: string | null = null;

export function completer(line: string): [string[], string] {
  const builtinMatches = Object.keys(builtins).filter(name => name.startsWith(line));
  const pathMatches = getExecutablesInPath(line);

  let allMatches = Array.from(new Set([...builtinMatches, ...pathMatches])).sort();
  let isFileCompletion = false;

  // Fallback to filesystem completion when no command/executable matches
  if (allMatches.length === 0) {
    const { matches } = getFileMatches(line);
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
    // Directories get a trailing "/" and no space, so completion can continue
    const suffix = isFileCompletion && match.endsWith("/") ? "" : " ";
    return [[match + suffix], line];
  }

  // Multiple matches: try to extend to the longest common prefix
  const commonPrefix = longestCommonPrefix(allMatches);

  if (commonPrefix.length > line.length) {
    lastCompletionLine = null;
    return [[commonPrefix], line];
  }

  // No further unambiguous extension possible
  if (lastCompletionLine !== line) {
    process.stdout.write("\x07");
    lastCompletionLine = line;
    return [[], line];
  }

  // For file listings, show basenames only (not full paths) like bash does
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
  // Split into directory part and basename part
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
    if (entry.startsWith(".") && !base.startsWith(".")) continue; // hide dotfiles unless explicitly requested

    const fullPath = (dir === "." ? "" : dir) + entry;
    let isDir = false;
    try {
      isDir = fs.statSync(fullPath).isDirectory();
    } catch {}

    matches.push(dir + entry + (isDir ? "/" : ""));
  }

  return { matches: matches.sort(), dir, base };
}