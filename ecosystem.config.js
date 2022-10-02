module.exports = {
    apps: [
        {
            name: 'server',
            script: './dist/main.js',
        },
        {
            name: 'worker',
            script: './dist/worker.js',
        },
    ],
};
