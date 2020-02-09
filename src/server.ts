import * as path from "path";
import { Process, config, log } from "./index";

async function main() {
  config.set("general.paths.plugins", [
    path.join(process.cwd(), "node_modules"),
    path.join(process.cwd(), "plugins", "web"),
    path.join(process.cwd(), "plugins", "websocket")
  ]);

  const app = new Process();
  app.addPlugin("web", { path: path.join(process.cwd(), "plugins", "web") });
  app.addPlugin("websocket", {
    path: path.join(process.cwd(), "plugins", "websocket")
  });

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
