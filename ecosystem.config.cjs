module.exports = {
  apps: [{
    name: "eventum",
    cwd: __dirname,
    script: "pnpm",
    args: "start",
    interpreter: "none",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 3000,
    kill_timeout: 5000,
  }],
};
