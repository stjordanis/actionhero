export const DEFAULT = {
  plugins: config => {
    return {
      web: { path: `${__dirname}/../../../web` },
      websocket: { path: `${__dirname}/../../../websocket` }
    };
  }
};
