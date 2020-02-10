import { Process, log } from "../../core";

async function main() {
  const app = new Process();

  // handle errors & rejections
  process.on("uncaughtException", (error: Error) => {
    log(error.stack, "fatal");
    process.nextTick(process.exit);
  });

  process.on("unhandledRejection", (rejection: Error) => {
    log(rejection.stack, "fatal");
    process.nextTick(process.exit);
  });

  // handle signals
  process.on("SIGINT", async () => {
    await app.stop();
  });

  process.on("SIGTERM", async () => {
    await app.stop();
  });

  process.on("SIGUSR2", async () => {
    await app.restart();
  });

  // start the app!
  await app.start();
}

main();
