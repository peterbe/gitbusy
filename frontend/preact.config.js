export default (config, env, helpers) => {
  config.devServer.proxy = [
    {
      path: '/api/**',
      target: 'http://localhost:8000',
      // ...any other stuff...
    }
  ];
}
