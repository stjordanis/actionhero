export const DEFAULT = {
  plugins: () => {
    return {
      web: {
        path: `${__dirname}/../../node_modules/@actionhero/web`
      },
      websocket: {
        path: `${__dirname}/../../node_modules/@actionhero/websocket`
      }
      // cache: { path: `${__dirname}/../../../cache` }
    };
  }
};
