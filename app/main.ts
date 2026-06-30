import { createInterface } from "readline";
import os from "os";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

type Command = {
  name: string;
  minArgs: number;
  maxArgs: number | null;
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

const commands: Command[] = [
  { name: "exit", minArgs: 0, maxArgs: 0 },
  { name: "echo", minArgs: 1, maxArgs: null },
  { name: "type", minArgs: 1, maxArgs: 1 },
  { name: "pwd", minArgs: 0, maxArgs: 0 },
  { name: "cd", minArgs: 0, maxArgs: 1 },
];

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
  const { command, args, redirects } = parsed;

  switch (command) {
    case "exit":
      rl.close();
      return;

    case "echo":
      handleEchoCommand(args, redirects);
      break;

    case "type":
      handleTypeCommand(args);
      break;

    case "pwd":
      console.log(process.cwd());
      break;

    case "cd":
      handleCdCommand(args);
      break;

    default:
      runExternalCommand(command, args, redirects);
      break;
  }
}

function handleEchoCommand(args: string[], redirects: Redirect[]): void {
  const output = args.join(" ");
  if (redirects.length > 0) {
    const redirect = redirects[0];
    const fs = require("fs");
    try {
      if (redirect.type === "stdout") {
        fs.writeFileSync(redirect.file, output + "\n", { flag: redirect.append ? "a" : "w" });
      }
    } catch (err: any) {
      console.log(`Error writing to file ${redirect.file}: ${err.message}`);
    }
    return;
  }

  console.log(output);
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
  if (commands.some((cmd) => cmd.name === args[0])) {
    console.log(`${args[0]} is a shell builtin`)
    return;
  }
  if (!process.env.PATH) {
    console.log("PATH environment variable is not set");
    return;
  }

  const pathDirs: string[] = process.env.PATH.split(":");
  let found: boolean = false;
  for (const dir of pathDirs) {
    const commandPath: string = `${dir}/${args[0]}`;
    try {
      require("fs").accessSync(commandPath, require("fs").constants.X_OK);
      console.log(`${args[0]} is ${commandPath}`);
      found = true;
      break;
    } catch (err: any) {
      // command not found in this directory, continue searching
    }
  }
  if (!found) {
    console.log(`${args[0]}: not found`);
  }
}

function buildStdio(redirects: Redirect[]): ["inherit" | number, "inherit" | number, "inherit" | number] {
  const fs = require("fs");
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
  const fs = require("fs");
  const stdio = buildStdio(redirects);

  try {
    require("child_process").execFileSync(command, args, { stdio });
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

function handleArgumentNumber(command: string, args: string[]): boolean {
  // Tell if builtin command has too many or too few arguments
  const cmd = commands.find((cmd) => cmd.name === command);

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

  for (const char of line.trim()) {

    // Handle escape character outside simple quotes (single quote mode)
    if (quoteMode === "single") {
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
        // Only these chars are "really" escaped inside double quotes
        if (char === "\\" || char === "$" || char === '"' || char === "`") {
          current += char;
        } else {
          // backslash is kept literally for any other char
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
      redirectType = fd;
      continue;
    }

    // Outside of quotes, split on whitespace
    if (quoteMode === "none" && /\s/.test(char)) {
      if (current) {
        if (redirectType) {
          redirects.push({
            type: redirectType,
            file: current,
          });
          redirectType = null;
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
      redirects.push({
        type: redirectType,
        file: current,
      });
      redirectType = null;
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

function handleDoubleQuote(char: string): string {
  return char; // TODO later
}

function handleSingleQuote(char: string): string {
  return char; // TODO later
}