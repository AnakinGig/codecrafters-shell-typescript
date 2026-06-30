import { createInterface } from "readline";
import os from "os";
import fs from "fs";
import child_process from "child_process";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
  completer: completer,
});

type Builtin = {
  minArgs: number;
  maxArgs: number | null;
  execute(args: string[], redirects: Redirect[]): void;
}

type Redirect = {
  type: "stdout" | "stdin" | "stderr";
  append?: boolean;
  file: string;
}

type ParsedCommand = {
  command: string;
  args: string[];
  redirects: Redirect[];
}

const builtins: Record<string, Builtin> = {
  exit:{
    minArgs: 0,
    maxArgs: 0,
    execute: () => {
      rl.close();
      process.exit(0);
    }
  },

  echo: {
    minArgs: 1,
    maxArgs: null,
    execute: (args, redirects) => {
      handleEchoCommand(args, redirects);
    }
  },

  type: {
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => {
      handleTypeCommand(args);
    }
  },

  pwd: {
    minArgs: 0,
    maxArgs: 0,
    execute: () => {
      console.log(process.cwd());
    }
  },

  cd: {
    minArgs: 0,
    maxArgs: 1,
    execute: (args) => {
      handleCdCommand(args);
    }
  }
}
rl.prompt();

rl.on("line", (line) => {

  const parsed = parseCommandLine(line);

  if (!parsed.command) {
    rl.prompt();
    return;
  }

  if (!handleArgumentNumber(parsed.command, parsed.args)) {
    rl.prompt();
    return;
  }

  executeCommand(parsed);

  rl.prompt();
});

function executeCommand(parsed: ParsedCommand): void {
  const builtin = builtins[parsed.command];

  if (builtin) {
    builtin.execute(parsed.args, parsed.redirects);
  } else {
    runExternalCommand(parsed.command, parsed.args, parsed.redirects);
  }
}

let lastCompletionLine: string | null = null;

function completer(line: string): [string[], string] {
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

function longestCommonPrefix(strings: string[]): string {
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

function getFileMatches(prefix: string): { matches: string[]; dir: string; base: string } {
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

function handleEchoCommand(args: string[], redirects: Redirect[]): void {
  const output = args.join(" ");

  const stdoutRedirect = redirects.find(r => r.type === "stdout");
  const stderrRedirect = redirects.find(r => r.type === "stderr");

  if (stderrRedirect) {
    try {
      fs.writeFileSync(stderrRedirect.file, "", { flag: stderrRedirect.append ? "a" : "w" });
    } catch (err: any) {
      console.log(`Error writing to file ${stderrRedirect.file}: ${err.message}`);
    }
  }

  if (stdoutRedirect) {
    try {
      fs.writeFileSync(stdoutRedirect.file, output + "\n", { flag: stdoutRedirect.append ? "a" : "w" });
    } catch (err: any) {
      console.log(`Error writing to file ${stdoutRedirect.file}: ${err.message}`);
    }
  } else {
    console.log(output);
  }
}

function handleCdCommand(args: string[]): void {
  try {
    let path = args[0] || os.homedir();
    if (path.startsWith("~")) {
      path = path.replace("~", os.homedir());
    }
    process.chdir(path);
  } catch (err: any) {
    console.log(`cd: ${args[0]}: No such file or directory`);
  }
}

function handleTypeCommand(args: string[]): void {
  if (args[0] in builtins) {
    console.log(`${args[0]} is a shell builtin`);
    return;
  }
  
  const executable = findExecutableInPath(args[0]);
  if (executable) {
    console.log(`${args[0]} is ${executable}`);
    return;
  }
  console.log(`${args[0]}: not found`);
}

function buildStdio(redirects: Redirect[]): ["inherit" | number, "inherit" | number, "inherit" | number] {
  const stdio: ("inherit" | number)[] = ["inherit", "inherit", "inherit"];

  for (const redirect of redirects) {
    const flag = redirect.append ? "a" : "w";
    if (redirect.type === "stdout") {
      const fd = fs.openSync(redirect.file, flag);
      stdio[1] = fd;
    } else if (redirect.type === "stderr") {
      const fd = fs.openSync(redirect.file, flag);
      stdio[2] = fd;
    }
  }

  return stdio as ["inherit" | number, "inherit" | number, "inherit" | number];
}

function runExternalCommand(command: string, args: string[], redirects: Redirect[]): void {
  const stdio = buildStdio(redirects);

  try {
    child_process.execFileSync(command, args, { stdio });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log(`${command}: command not found`);
    } else if (err.status !== undefined) {
      // The command was found but exited with a non-zero status code
    } else {
      console.log(`${command}: command not found`);
    }
  } finally {
    // close the file descriptors if they were opened
    for (const fd of stdio) {
      if (typeof fd === "number") {
        try { fs.closeSync(fd); } catch {}
      }
    }
  }
}

function findExecutableInPath(command: string): string | null {
  if (!process.env.PATH) {
    return null;
  }

  const pathDirs: string[] = process.env.PATH.split(":");
  for (const dir of pathDirs) {
    const commandPath: string = `${dir}/${command}`;
    try {
      fs.accessSync(commandPath, fs.constants.X_OK);
      return commandPath;
    } catch (err: any) {
      // command not found in this directory, continue searching
    }
  }
  return null;
}

function getExecutablesInPath(prefix = ""): string[] {
  if (!process.env.PATH) {
    return [];
  }

  const executables = new Set<string>();

  for (const dir of process.env.PATH.split(":")) {
    let entries: string[];

    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.startsWith(prefix)) {
        continue;
      }

      try {
        fs.accessSync(`${dir}/${entry}`, fs.constants.X_OK);
        executables.add(entry);
      } catch {}
    }
  }

  return [...executables].sort();
}

function handleArgumentNumber(command: string, args: string[]): boolean {
  // Tell if builtin command has too many or too few arguments
  const cmd = builtins[command];

  if (!cmd) return true; // Not a builtin command, let the OS handle it

  if (args.length < cmd.minArgs) {
    console.log(`${command}: too few arguments`);
    return false;
  }
  if (cmd.maxArgs !== null && args.length > cmd.maxArgs) {
    console.log(`${command}: too many arguments`);
    return false;
  }
  return true;
}

function parseCommandLine(line: string): ParsedCommand {
  const tokens: string[] = [];
  const redirects: Redirect[] = [];
  let current = "";

  let quoteMode: "none" | "single" | "double" = "none";
  let escaped = false;
  let redirectType: "stdout" | "stderr" | null = null;
  let redirectAppend = false;

  const trimmed = line.trim();

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    // Handle escape character outside of any quotes
    if (quoteMode === "none") {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
    }

    // Handle escape character inside double quotes (selective)
    if (quoteMode === "double") {
      if (escaped) {
        if (char === "\\" || char === "$" || char === '"' || char === "`") {
          current += char;
        } else {
          current += "\\" + char;
        }
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
    }

    // Handle single quotes
    if (char === "'" && quoteMode !== "double") {
      quoteMode = quoteMode === "single" ? "none" : "single";
      continue;
    }

    // Handle double quotes
    if (char === '"' && quoteMode !== "single") {
      quoteMode = quoteMode === "double" ? "none" : "double";
      continue;
    }

    if (quoteMode === "none" && char === ">") {
      let fd: "stdout" | "stderr" = "stdout";
      if (current === "1") {
        current = "";
      } else if (current === "2") {
        fd = "stderr";
        current = "";
      } else if (current) {
        tokens.push(current);
        current = "";
      }

      // Check for >> (append)
      if (trimmed[i + 1] === ">") {
        redirectAppend = true;
        i++; // skip the second '>'
      } else {
        redirectAppend = false;
      }

      redirectType = fd;
      continue;
    }

    if (quoteMode === "none" && /\s/.test(char)) {
      if (current) {
        if (redirectType) {
          redirects.push({ type: redirectType, file: current, append: redirectAppend });
          redirectType = null;
          redirectAppend = false;
        } else {
          tokens.push(current);
        }
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaped) {
    current += "\\";
  }

  if (current) {
    if (redirectType) {
      redirects.push({ type: redirectType, file: current, append: redirectAppend });
      redirectType = null;
      redirectAppend = false;
    } else {
      tokens.push(current);
    }
  }

  if (redirectType) {
    console.log("syntax error: expected file after >");
    return { command: "", args: [], redirects: [] };
  }

  return {
    command: tokens[0] ?? "",
    args: tokens.slice(1),
    redirects,
  };
}