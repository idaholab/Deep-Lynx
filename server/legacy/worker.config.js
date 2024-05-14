module.exports = {
    apps: [
        {
            name: 'worker',
            script: './dist/worker.js',
            instances: 'max',
            exec_mode: 'cluster',
        },
    ],
};
