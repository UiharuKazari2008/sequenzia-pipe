module.exports = {
    apps : [
        {
            name : "Sequenzia Proxy",
            namespace: "seq-proxy",
            script : "./index.js",
            watch: true,
            watch_delay: 1000,
            instances: 2,
            cron_restart: '0 4 * * *',
            stop_exit_codes: [0],
            restart_delay: 5000,
            kill_timeout : 3000,
            exp_backoff_restart_delay: 100,
            max_memory_restart: "1500M",
            env: {
                NODE_ENV: 'production',
            },
            env_production: {
                NODE_ENV: 'production'
            }
        }
    ]
}
