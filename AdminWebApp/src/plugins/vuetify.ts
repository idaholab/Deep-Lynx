import Vue from 'vue';
import Vuetify from 'vuetify/lib';

Vue.use(Vuetify);

export default new Vuetify({
  icons: {
    iconfont: 'mdiSvg'
  },
  theme: {
    themes: {
      light: {
        primary: '#2BA8E0',
        success: '#2BA8E0',
        secondary: '#CD7F32',
        warning: '#CD7F32',
        error: '#CF1E4C',
        text: '#333333',
        lightgray: '#DCDDDE',
        darkgray: '#AFAFAF'
      }
    }
  }
});
