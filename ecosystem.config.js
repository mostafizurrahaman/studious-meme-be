module.exports = {
  apps: [
    {
      name: 'malamal-apis',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
