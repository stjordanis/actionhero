import * as path from "path";
import * as glob from "glob";
import { api, config, log, utils, Initializer, Server } from "../index";

export interface ServersApi {
  servers: {
    [key: string]: Server;
  };
}

/**
 * Manages the servers in this ActionHero instance.
 */
export class Servers extends Initializer {
  constructor() {
    super();
    this.name = "servers";
    this.loadPriority = 599;
    this.startPriority = 900;
    this.stopPriority = 100;
  }

  async initialize() {
    api.servers = {
      servers: {}
    };

    const serverFolders = [path.resolve(path.join(__dirname, "..", "servers"))];

    config.general.paths.server.forEach(p => {
      p = path.resolve(p);
      if (serverFolders.indexOf(p) < 0) {
        serverFolders.push(p);
      }
    });

    let files = [];

    for (const i in serverFolders) {
      const p = serverFolders[i];
      files = files.concat(glob.sync(path.join(p, "**", "**/*(*.js|*.ts)")));
    }

    for (const pluginName in config.plugins) {
      if (config.plugins[pluginName].servers !== false) {
        const pluginPath = config.plugins[pluginName].path;
        // old style at the root of the project
        files = files.concat(
          glob.sync(path.join(pluginPath, "servers", "**", "*.js|"))
        );

        files = files.concat(
          glob.sync(path.join(pluginPath, "dist", "servers", "**", "*.js"))
        );
      }
    }

    files = utils.ensureNoTsHeaderFiles(files);

    for (const j in files) {
      const filename = files[j];
      const ExportedClasses = require(filename);

      if (Object.keys(ExportedClasses).length > 1) {
        throw new Error(`server file ${filename} exports more than one server`);
      }

      const server: Server = new ExportedClasses[
        Object.keys(ExportedClasses)[0]
      ]();

      if (config.servers[server.type]?.enabled === true) {
        if (api.servers.servers[server.type]) {
          log(
            `an existing server with the same type \`${server.type}\` will be overridden by the file ${filename}`,
            "warning"
          );
        }
        server.config = config.servers[server.type]; // shorthand access
        api.servers.servers[server.type] = server;
      }
    }

    for (const serverName in api.servers.servers) {
      const server = api.servers.servers[serverName];
      await server.initialize();
      log(`Initialized server: ${server.type}`, "debug");
    }
  }

  async start() {
    const sortedServerNames = Object.keys(api.servers.servers).sort((a, b) => {
      return (
        (api.servers.servers[a].dependencies
          ? api.servers.servers[a].dependencies.length
          : 0) -
        (api.servers.servers[b].dependencies
          ? api.servers.servers[b].dependencies.length
          : 0)
      );
    });

    for (const i in sortedServerNames) {
      const serverName = sortedServerNames[i];
      const server = api.servers.servers[serverName];
      if (server && server.config.enabled === true) {
        let message = "";
        message += `Starting server: \`${serverName}\``;
        if (config.servers[serverName].bindIP) {
          message += ` @ ${config.servers[serverName].bindIP}`;
        }
        if (config.servers[serverName].port) {
          message += `:${config.servers[serverName].port}`;
        }
        log(message, "notice");
        await server.start();
        log(`Server started: ${serverName}`, "debug");
      }
    }
  }

  async stop() {
    const serverNames = Object.keys(api.servers.servers);
    for (const i in serverNames) {
      const serverName = serverNames[i];
      const server = api.servers.servers[serverName];
      if ((server && server.config.enabled === true) || !server) {
        log(`Stopping server: ${serverName}`, "notice");
        await server.stop();
        server.removeAllListeners();
        log(`Server stopped: ${serverName}`, "debug");
      }
    }
  }
}
