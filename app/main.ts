import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

rl.on("line", (command) => {
  handleCommands(command);
  rl.prompt();
});

function handleCommands(command: string) {
 const args: string[] = command.trim().split(" ");

  switch (args[0]) {
    case "exit":
      rl.close();
      break;
    case "echo":
      console.log(args.slice(1).join(" "));
      break;
    default:
      console.log(`${command}: command not found`);
  }
}