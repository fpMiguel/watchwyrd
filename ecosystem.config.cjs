/**
 * PM2 Ecosystem Configuration for Watchwyrd
 *
 * Enables cluster mode to utilize multiple CPU cores for improved throughput.
 * Each worker process gets its own event loop and shares the server port.
 */

module.exports = {
  apps: [
    {
      name: 'watchwyrd',
      script: './dist/index.js',

      // Cluster configuration
      instances: 'max', // Auto-detect CPU cores and spawn that many workers
      exec_mode: 'cluster', // Enable cluster mode (vs fork mode)

      // Resource limits
      max_memory_restart: '500M', // Restart if worker exceeds 500MB

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 7000,
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: 7000,
        LOG_LEVEL: 'debug',
      },

      env_load_test: {
        NODE_ENV: 'test',
        PORT: 7000,
        MOCK_MODE: 'true',
        SECRET_KEY: 'test-secret-key',
        LOG_LEVEL: 'info',
      },

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Process management
      autorestart: true, // Auto-restart on crash
      watch: false, // Don't auto-restart on file changes (use in dev only)
      max_restarts: 10, // Max restarts within min_uptime before giving up
      min_uptime: '10s', // Min uptime to not be considered crashed

      // Graceful shutdown
      kill_timeout: 5000, // Wait 5s for graceful shutdown before SIGKILL
      wait_ready: true, // Wait for process.send('ready') before considering started
      listen_timeout: 10000, // Max time to wait for listen event

      // Advanced
      node_args: '--max-old-space-size=512', // Limit heap to 512MB per worker
    },
  ],
};
