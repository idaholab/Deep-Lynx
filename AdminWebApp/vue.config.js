module.exports = {
    transpileDependencies: ['vuetify', '@observablehq/plot', 'plot', 'vuex-persist'],
    devServer: {
        clientLogLevel: 'info',
        host: 'localhost',
        disableHostCheck: true,
        inline: false,
        watchOptions: {
            poll: true,
        },
    },
    runtimeCompiler: true
};
