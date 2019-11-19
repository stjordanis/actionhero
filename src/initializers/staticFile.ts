import * as fs from "fs";
import * as path from "path";
import * as Mime from "mime";
import { api, Initializer } from "../index";
import { Connection } from "./../classes/connection";

async function asyncStats(file: string): Promise<{ [key: string]: any }> {
  return new Promise((resolve, reject) => {
    fs.stat(file, (error, stats) => {
      if (error) {
        return reject(error);
      }
      return resolve(stats);
    });
  });
}

async function asyncReadLink(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readlink(file, (error, linkString) => {
      if (error) {
        return reject(error);
      }
      return resolve(linkString);
    });
  });
}

/**
 * Countains helpers for returning flies to connections.
 */
export class StaticFile extends Initializer {
  constructor() {
    super();
    this.name = "staticFile";
    this.loadPriority = 510;
  }

  async initialize() {
    api.staticFile = {
      searchLoactions: []
    };

    /**
     * For a connection with `connecton.params.file` set, return a file if we can find it, or a not-found message.
     * `searchLoactions` will be cheked in the following order: first paths in this project, then plugins.
     * This can be used in Actions to return files to clients.  If done, set `data.toRender = false` within the action.
     * return is of the form: {connection, error, fileStream, mime, length}
     */
    api.staticFile.get = async (
      connection: Connection,
      counter: number = 0
    ) => {
      let file: string;
      if (!connection.params.file || !api.staticFile.searchPath(counter)) {
        return api.staticFile.sendFileNotFound(
          connection,
          await api.config.errors.fileNotProvided(connection)
        );
      }

      if (!path.isAbsolute(connection.params.file)) {
        file = path.normalize(
          path.join(api.staticFile.searchPath(counter), connection.params.file)
        );
      } else {
        file = connection.params.file;
      }

      if (
        file.indexOf(path.normalize(api.staticFile.searchPath(counter))) !== 0
      ) {
        return api.staticFile.get(connection, counter + 1);
      } else {
        const { exists, truePath } = await api.staticFile.checkExistence(file);
        if (exists) {
          return api.staticFile.sendFile(truePath, connection);
        } else {
          return api.staticFile.get(connection, counter + 1);
        }
      }
    };

    api.staticFile.searchPath = (counter: number = 0) => {
      if (
        api.staticFile.searchLoactions.length === 0 ||
        counter >= api.staticFile.searchLoactions.length
      ) {
        return null;
      } else {
        return api.staticFile.searchLoactions[counter];
      }
    };

    api.staticFile.sendFile = async (file: string, connection: Connection) => {
      let lastModified: number;

      try {
        const stats = await asyncStats(file);
        const mime = Mime.getType(file);
        const length = stats.size;
        const start = new Date().getTime();
        lastModified = stats.mtime;

        const fileStream = fs.createReadStream(file);
        api.staticFile.fileLogger(fileStream, connection, start, file, length);

        await new Promise(resolve => {
          fileStream.on("open", () => {
            resolve();
          });
        });

        return { connection, fileStream, mime, length, lastModified };
      } catch (error) {
        return api.staticFile.sendFileNotFound(
          connection,
          await api.config.errors.fileReadError(connection, String(error))
        );
      }
    };

    api.staticFile.fileLogger = (
      fileStream: any,
      connection: Connection,
      start: number,
      file: string,
      length: number
    ) => {
      fileStream.on("end", () => {
        const duration = new Date().getTime() - start;
        api.staticFile.logRequest(file, connection, length, duration, true);
      });

      fileStream.on("error", error => {
        throw error;
      });
    };

    api.staticFile.sendFileNotFound = async (connection, errorMessage) => {
      connection.error = new Error(errorMessage);
      api.staticFile.logRequest("{not found}", connection, null, null, false);
      return {
        connection,
        error: await api.config.errors.fileNotFound(connection),
        mime: "text/html",
        length: await api.config.errors.fileNotFound(connection).length
      };
    };

    api.staticFile.checkExistence = async file => {
      try {
        const stats = await asyncStats(file);

        if (stats.isDirectory()) {
          const indexPath = file + "/" + api.config.general.directoryFileType;
          return api.staticFile.checkExistence(indexPath);
        }

        if (stats.isSymbolicLink()) {
          let truePath = await asyncReadLink(file);
          truePath = path.normalize(truePath);
          return api.staticFile.checkExistence(truePath);
        }

        if (stats.isFile()) {
          return { exists: true, truePath: file };
        }

        return { exists: false, truePath: file };
      } catch (error) {
        return { exists: false, truePath: file };
      }
    };

    api.staticFile.logRequest = (
      file: string,
      connection: Connection,
      length: number,
      duration: number,
      success: boolean
    ) => {
      api.log(
        `[ file @ ${connection.type} ]`,
        api.config.general.fileRequestLogLevel,
        {
          to: connection.remoteIP,
          file: file,
          requestedFile: connection.params.file,
          size: length,
          duration: duration,
          success: success
        }
      );
    };

    // load in the explicit public paths first
    if (api.config.general.paths !== undefined) {
      api.config.general.paths.public.forEach(function(p) {
        api.staticFile.searchLoactions.push(path.normalize(p));
      });
    }

    // source the public directories from plugins
    for (const pluginName in api.config.plugins) {
      if (api.config.plugins[pluginName].public !== false) {
        const pluginPublicPath = path.join(
          api.config.plugins[pluginName].path,
          "public"
        );
        if (
          fs.existsSync(pluginPublicPath) &&
          api.staticFile.searchLoactions.indexOf(pluginPublicPath) < 0
        ) {
          api.staticFile.searchLoactions.push(pluginPublicPath);
        }
      }
    }

    api.log(
      "static files will be served from these directories",
      "debug",
      api.staticFile.searchLoactions
    );
  }
}