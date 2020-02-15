import { Process } from "../../core";

async function main() {
  const app = new Process();

  // handle unix signals and uncaught exceptions & rejections
  app.registerProcessSignals();

  // start the app!
  await app.start();
}

main();
