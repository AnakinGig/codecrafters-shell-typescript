import fs from "fs";
import { execFileSync } from "child_process";

import { getExecutablesInPath } from "../utils/path";
import { builtins } from "../builtins";
import { getCompletionSpec } from "../builtins/complete";
import { rl } from "../index";

let lastCompletionLine: string | null = null;

export function completer(line: string): [string[], string] {
  const { prefix, word } = getLastWord(line);
  const isFirstWord = prefix === "";

  let allMatches: string[] = [];
  let isFileCompletion = false;

  if (isFirstWord) {
    const builtinMatches = Object.keys(builtins).filter(name => name.startsWith(word));
    const pathMatches = getExecutablesInPath(word);
    allMatches = Array.from(new Set([...builtinMatches, ...pathMatches])).sort();
  } else {
    // Check for a registered external completer first
    const customMatches = getCustomCompletions(line, word);
    if (customMatches !== null) {
      allMatches = customMatches;
    }
  }

  // Fallback to filesystem completion when nothing else matched
  if (allMatches.length === 0) {
    const { matches } = getFileMatches(word);
    if (matches.length > 0) {
      allMatches = matches;
      isFileCompletion = true;
    }
  }

  if (allMatches.length === 0) {
    process.stdout.write("\x07");
    lastCompletionLine = null;
    return [[], line];
  }

  if (allMatches.length === 1) {
    lastCompletionLine = null;
    const match = allMatches[0];
    const suffix = isFileCompletion && match.endsWith("/") ? "" : " ";
    return [[prefix + match + suffix], line];
  }

  const commonPrefix = longestCommonPrefix(allMatches);

  if (commonPrefix.length > word.length) {
    lastCompletionLine = null;
    return [[prefix + commonPrefix], line];
  }

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
  (rl as any).cursor = line.length;
  (rl as any)._refreshLine?.();
  lastCompletionLine = null;

  return [[], line];
}

function getLastWord(line: string): { prefix: string; word: string } {
  const lastSpaceIndex = line.lastIndexOf(" ");
  const prefix = lastSpaceIndex === -1 ? "" : line.slice(0, lastSpaceIndex + 1);
  const word = lastSpaceIndex === -1 ? line : line.slice(lastSpaceIndex + 1);
  return { prefix, word };
}

function getCustomCompletions(line: string, word: string): string[] | null {
  const firstSpaceIndex = line.indexOf(" ");
  if (firstSpaceIndex === -1) return null;

  const command = line.slice(0, firstSpaceIndex);
  const spec = getCompletionSpec(command);
  if (!spec) return null;

  const restOfLine = line.slice(firstSpaceIndex + 1);
  const words = restOfLine.split(" ").filter(w => w.length > 0);

  let previousWord = command; // default: the command itself, when completing the first arg
  if (words.length > 0) {
    const lastWord = words[words.length - 1];
    if (lastWord === word) {
      // word being completed is the last token; previous word is the one before it,
      // or the command itself if there's nothing before
      previousWord = words.length > 1 ? words[words.length - 2] : command;
    } else {
      // word is empty (trailing space before TAB), last token is the previous word
      previousWord = lastWord;
    }
  }

  try {
    const output = execFileSync(spec.value, [command, word, previousWord], {
      encoding: "utf8",
      env: {
        ...process.env,
        COMP_LINE: line,
        COMP_POINT: String(Buffer.byteLength(line, "utf8")),
      },
    });

    const candidates = output
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .sort();

    return candidates;
  } catch {
    return [];
  }
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
  const displayDir = lastSlash === -1 ? "" : prefix.slice(0, lastSlash + 1);
  const searchDir = lastSlash === -1 ? "." : prefix.slice(0, lastSlash + 1);
  const base = lastSlash === -1 ? prefix : prefix.slice(lastSlash + 1);

  let entries: string[];
  try {
    entries = fs.readdirSync(searchDir);
  } catch {
    return { matches: [], dir: displayDir, base };
  }

  const matches: string[] = [];
  for (const entry of entries) {
    if (!entry.startsWith(base)) continue;
    if (entry.startsWith(".") && !base.startsWith(".")) continue;

    const fullPath = searchDir === "." ? entry : searchDir + entry;
    let isDir = false;
    try {
      isDir = fs.statSync(fullPath).isDirectory();
    } catch {}

    matches.push(displayDir + entry + (isDir ? "/" : ""));
  }

  return { matches: matches.sort(), dir: displayDir, base };
}