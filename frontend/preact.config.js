import asyncPlugin from 'preact-cli-plugin-fast-async';

export default (config, env, helpers) => {
  // Needed because of https://github.com/preactjs/preact-cli/issues/578
  asyncPlugin(config);

  if (config.devServer) {
    config.devServer.proxy = [
      {
        path: "/api/**",
        target: "http://localhost:8000"
        // ...any other stuff...
      }
    ];
  }
};
