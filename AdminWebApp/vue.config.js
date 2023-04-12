module.exports = {
    transpileDependencies: ['vuetify', 'plot', 'vuex-persist'],
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
