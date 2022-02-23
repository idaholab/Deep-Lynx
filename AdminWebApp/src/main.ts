import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import VueI18n from 'vue-i18n';
import translations from './translations';
import vuetify from './plugins/vuetify';
import AuthPlugin from '@/auth/authentication_service';
import ClientPlugin from '@/api/client';
import Config from '@/config';
import ErrorBanner from '@/components/errorBanner.vue';
import SuccessBanner from '@/components/successBanner.vue';
import InfoTooltip from '@/components/infoTooltip.vue';
import JSONView from 'vue-json-component';
import VueCytoscape from 'vue-cytoscape';

Vue.config.productionTip = false;
Vue.config.devtools = true;
Vue.use(ElementUI);
Vue.use(VueI18n);
Vue.use(JSONView);
Vue.use(VueCytoscape);

const i18n = new VueI18n({
    locale: 'en', // if you need get the browser language use following "window.navigator.language"
    messages: translations,
    silentTranslationWarn: true,
});

Vue.use(ClientPlugin, {
    rootURL: Config.deepLynxApiUri,
    auth_method: Config.deepLynxApiAuth,
    username: Config.deepLynxApiAuthBasicUser,
    password: Config.deepLynxApiAuthBasicPass,
});

Vue.use(AuthPlugin);

// register our error handling banner for use across the whole app
Vue.component('error-banner', ErrorBanner);
Vue.component('success-banner', SuccessBanner);
Vue.component('info-tooltip', InfoTooltip);

new Vue({
    i18n,
    router,
    store,
    // @ts-ignore
    vuetify,
    beforeCreate() {
        this.$store.commit('initializeStore');
    },
    render: (h) => h(App),
}).$mount('#app');
