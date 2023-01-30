module.exports = {
    apps: [
        {
            name: 'queue_worker',
            script: './dist/queue_worker.js',
            instances: 'max',
            exec_mode: 'cluster'
        },
    ],
};