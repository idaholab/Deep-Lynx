module.exports = {
    publicPath: process.env.VUE_APP_BUNDLED_BUILD === 'true' ? '/gui/' : undefined,
    transpileDependencies: ['vuetify'],
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
