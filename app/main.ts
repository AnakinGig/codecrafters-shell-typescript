import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

type Command = {
  name: string;
  args: string[];
}

const commands: Command[] = [
  { name: "exit", args: [] },
  { name: "echo", args: ["text"] },
  { name: "type", args: ["command"] },
  { name: "pwd", args: [] },
  { name: "cd", args: ["directory"] },
];

rl.prompt();

rl.on("line", (line) => {

  const command: string = line.trim().split(" ")[0];

  const args: string[] = [];
  let current = "";

  for (const match of line.matchAll(/'([^']*)'|[^'\s]+|\s+/g)) {
    const token = match[0];

    if (/^\s+$/.test(token)) {
      if (current !== "") {
        args.push(current);
        current = "";
      }
    } else if (token.startsWith("'")) {
      current += token.slice(1, -1); // enlève les quotes
    } else {
      current += token;
    }
  }

  if (current !== "") {
    args.push(current);
  }

  if (!handleArguments(command, args)) {
    rl.prompt();
    return;
  }

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
    // Handle ~ as home directory
    if (args[0] === "~") {
      process.chdir(require("os").homedir());
      return;
    }
    process.chdir(args[0]);
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

function handleArguments(command: string, args: string[]): boolean {
  // Tell if command has too many or too few arguments

  if (command === "echo"){return true;} // echo can take any number of arguments

  const cmd = commands.find((cmd) => cmd.name === command);
  if (!cmd) {return false;}
  if (args.length < cmd.args.length) {
    console.log(`${command}: too few arguments`);
    return false;
  }
  if (args.length > cmd.args.length) {
    console.log(`${command}: too many arguments`);
    return false;
  }
  return true;
}