import * as fs from "fs";
import * as cluster from "cluster";
import { log } from "../../modules/log";
import { config } from "./../../modules/config";
import { id } from "./id";

function sanitizeId() {
  let pidFile = String(id).trim();
  pidFile = pidFile.replace(new RegExp(":", "g"), "-");
  pidFile = pidFile.replace(new RegExp(" ", "g"), "_");

  return pidFile;
}

export const pid = process.pid;
const path = config.general.paths.pid[0]; // it would be silly to have more than one pi
let title = sanitizeId();

if (cluster.isMaster) {
  title = "actionhero-" + title;
}

try {
  fs.mkdirSync(path);
} catch (e) {}

export function writePidFile() {
  log(`pid: ${process.pid}`, "notice");
  fs.writeFileSync(path + "/" + title, pid.toString(), "ascii");
}

export function clearPidFile() {
  try {
    fs.unlinkSync(path + "/" + title);
  } catch (error) {
    log("Unable to remove pidFile", "error", error);
  }
}
