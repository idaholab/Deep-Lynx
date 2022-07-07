module.exports = {
    transpileDependencies: ['vuetify', '@observablehq/plot', 'plot', 'vuex-persist'],
    devServer: {
        client: {
            logging: 'info',
        },
        host: 'localhost',
        allowedHosts: 'all',
        static: {
            watch: true,
        },
    },
    runtimeCompiler: true,
};
