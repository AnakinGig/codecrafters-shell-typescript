import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

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
    default:
      console.log(`${args[0]}: command not found`);
  }

  rl.prompt();
});