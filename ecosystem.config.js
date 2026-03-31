/**
 * PM2 ecosystem config — production process manager
 *
 * Install:  npm install -g pm2
 * Start:    pm2 start ecosystem.config.js
 * Monitor:  pm2 monit
 * Logs:     pm2 logs paperclip-api
 * Restart:  pm2 restart paperclip-api
 * Stop:     pm2 stop paperclip-api
 * Auto-start on reboot: pm2 startup && pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'paperclip-api',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,             // do NOT watch in production
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
