module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  devServer: {
    clientLogLevel: 'info',
    host: 'localhost',
    disableHostCheck: true,
    inline: false,
    watchOptions: {
      poll: true
    }
  }
}
