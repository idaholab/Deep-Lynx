module.exports = {
    apps: [
        {
            name: 'server',
            script: './dist/main.js',
        },
        {
            name: 'emitter_worker',
            script: './dist/emitter_worker.js',
        },
        {
            name: 'event_worker',
            script: './dist/event_worker.js',
        },
    ],
};