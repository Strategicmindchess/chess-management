module.exports = {
  apps: [
    {
      name: 'smc-worker',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'worker.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
