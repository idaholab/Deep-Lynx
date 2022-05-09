module.exports = {
    transpileDependencies: ['vuetify', '@observablehq/plot', 'plot'],
    devServer: {
        clientLogLevel: 'info',
        host: 'localhost',
        disableHostCheck: true,
        inline: false,
        watchOptions: {
            poll: true,
        },
    },
};
