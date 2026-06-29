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

type ParsedCommand = {
  command: string;
  args: string[];
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

  // Command and arguments parsing
  const { command, args } = parseCommandLine(line);

  if (!command) {
    rl.prompt();
    return;
  }
  
  // Handle number of arguments for builtin commands
  if (!handleArgumentNumber(command, args)) {
    rl.prompt();
    return;
  }

  // Handle builtin commands
  switch (command) {
    case "exit":
      rl.close();
      return;
    case "echo":
      handleEchoCommand(args);
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
      // Not builtin command
      try {
        require("child_process").execFileSync(command, args, { stdio: "inherit" });
      } catch (err) {
        console.log(`${command}: command not found`);
      }
  }

  rl.prompt();
});

function handleEchoCommand(args: string[]): void {
  console.log(args.join(" "));
}

function handleCdCommand(args: string[]): void {
  try {
    let path = args[0] || os.homedir();
    if (path.startsWith("~")) {
      path = path.replace("~", os.homedir());
    }
    process.chdir(path);
  } catch (err) {
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
    } catch (err) {
      // command not found in this directory, continue searching
    }
  }
  if (!found) {
    console.log(`${args[0]}: not found`);
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
  let current = "";

  let quoteMode: "none" | "single" | "double" = "none";
  let escaped = false;

  for (const char of line.trim()) {

    // Handle escape character outside simple quotes
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

    // Process character within double quotes
    if (quoteMode === "double") {
      current += handleDoubleQuote(char);
      continue;
    }

    // Process character within single quotes
    if (quoteMode === "single") {
      current += handleSingleQuote(char);
      continue;
    }

    // Outside of quotes, split on whitespace
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
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
    tokens.push(current);
  }

  return { command: tokens[0] ?? "", args: tokens.slice(1) };
}

function handleDoubleQuote(char: string): string {
  return char; // TODO later
}

function handleSingleQuote(char: string): string {
  return char; // TODO later
}