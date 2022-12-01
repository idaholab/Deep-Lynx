module.exports = {
    apps: [
        {
            name: 'server',
            script: './dist/main.js',
        },
        {
            name: 'worker',
            script: './dist/worker.js',
            node_args: '--max_old_space_size=8192',
        },
    ],
};
