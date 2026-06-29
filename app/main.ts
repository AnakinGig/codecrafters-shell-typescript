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
      if (args.length === 2){
        if (commands.includes(args[1])) {
          console.log(`${args[1]} is a shell builtin`)
        }
        else {
          console.log(`${args[1]}: not found`);
        }
      }
      else {
        console.log("type: arguments error");
      }
      break;
    default:
      console.log(`${args[0]}: command not found`);
  }

  rl.prompt();
});