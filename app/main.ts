import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

const commands: string[] = ["echo", "exit", "type", "pwd", "cd"];

rl.prompt();

rl.on("line", (command) => {

  const args: string[] = command.trim().split(" ");

  switch (args[0]) {
    case "exit":
      rl.close();
      return;
    case "echo":
      console.log(args.slice(1).join(" "));
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
        require("child_process").execFileSync(args[0], args.slice(1), { stdio: "inherit" });
      } catch (err) {
        console.log(`${args[0]}: command not found`);
      }
  }

  rl.prompt();
});

function handleCdCommand(args: string[]): void {
  if (args.length < 2) {
    console.log("cd: too few arguments");
    return;
  }
  if (args.length > 2) {
    console.log("cd: too many arguments");
    return;
  }

  try {
    process.chdir(args[1]);
  } catch (err) {
    console.log(`cd: ${args[1]}: No such file or directory`);
  }
}

function handleTypeCommand(args: string[]): void {
  if (args.length < 2){
    console.log("type: too few arguments");
    return;
  }
  if (args.length > 2) {
    console.log("type: too many arguments");
    return;
  }

  if (commands.includes(args[1])) {
    console.log(`${args[1]} is a shell builtin`)
    return;
  }
  if (!process.env.PATH) {
    console.log("PATH environment variable is not set");
    return;
  }

  const pathDirs: string[] = process.env.PATH.split(":");
    let found: boolean = false;
    for (const dir of pathDirs) {
      const commandPath: string = `${dir}/${args[1]}`;
      try {
        require("fs").accessSync(commandPath, require("fs").constants.X_OK);
        console.log(`${args[1]} is ${commandPath}`);
        found = true;
        break;
      } catch (err) {
        // command not found in this directory, continue searching
      }
    }
    if (!found) {
      console.log(`${args[1]}: not found`);
    }
}