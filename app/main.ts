import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

const commands: string[] = ["echo", "exit", "type"];

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
    default:
      console.log(`${args[0]}: command not found`);
  }

  rl.prompt();
});

function handleTypeCommand(args: string[]): void {
  if (args.length === 2){
    if (commands.includes(args[1])) {
      console.log(`${args[1]} is a shell builtin`)
    }
    else {
      if (process.env.PATH) {
        const pathDirs: string[] = process.env.PATH.split(":");
        let found: boolean = false;
        for (const dir of pathDirs) {
          const commandPath: string = `${dir}/${args[1]}`;
          try {
            // Check if the command exists in this directory and is executable
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
      } else {
        console.log("PATH environment variable is not set");
      }
    }
  }
  else {
    console.log("type: arguments error");
  }
}