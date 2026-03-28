module.exports = {
  apps: [
    {
      name: 'sentinel-backend',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      max_memory_restart: '1G',
      merge_logs: true,
      autorestart: true,
      watch: false
    }
  ]
};
