import Vue from 'vue';
import VueRouter, {Route} from 'vue-router';
import HomePage from '@/pages/HomePage.vue';
import ContainerSelect from '@/pages/ContainerSelect.vue';
import LoginPage from '@/pages/LoginPage.vue';
import {IsLoggedIn, LoginFromToken} from '@/auth/authentication_service';
import ContainerInvite from '@/pages/ContainerInvite.vue';
import {RawLocation} from 'vue-router/types/router';

Vue.use(VueRouter);

// we do this so we can easily ignore the duplicate navigation error, as we constantly see that on the home page
// due to how I handled routing
const originalReplace = VueRouter.prototype.replace;
VueRouter.prototype.replace = function replace(location: RawLocation): Promise<Route> {
    return new Promise((resolve, reject) => {
        originalReplace.call(
            this,
            location,
            () => {
                // on complete

                resolve(this.currentRoute);
            },
            (error) => {
                // on abort

                // only ignore NavigationDuplicated error
                if (error.name === 'NavigationDuplicated' || error.message.includes('Avoided redundant navigation to current location')) {
                    resolve(this.currentRoute);
                } else {
                    reject(error);
                }
            },
        );
    });
};

const routes = [
    {
        path: '/',
        name: 'ContainerSelect',
        component: ContainerSelect,
    },
    {
        path: '/containers/:containerID',
        name: 'Home',
        component: HomePage,
        props: true,
    },
    {
        path: '/containers/:containerID/:view/',
        name: 'Home View',
        component: HomePage,
        props: true,
    },
    {
        path: '/containers/:containerID/:view/:arguments',
        name: 'Home View Arguments',
        component: HomePage,
        props: true,
    },
    {
        path: '/container-invite',
        name: 'ContainerInvite',
        component: ContainerInvite,
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginPage,
    },
    {
        path: '*',
        redirect: '/',
    },
];

const router = new VueRouter({
    mode: process.env.VUE_APP_BUNDLED_BUILD === 'true' ? undefined : 'history',
    base: process.env.BASE_URL,
    routes,
});

router.beforeEach((to, from, next) => {
    const publicPages = ['/login', '/reset-password', '/validate', '/register', '/container-invite'];
    const authRequired = !publicPages.includes(to.path);

    // if main route we need to check if this is a redirect by checking
    // the presence of a JWT
    if (to.path === '/' && to.query.token) {
        LoginFromToken(to.query.token as string, to.query.state as string)
            .then((result) => {
                if (result) {
                    next('/');
                    return;
                }

                next('/login');
            })
            .catch(() => next('login'));
    } else {
        if (authRequired && !IsLoggedIn()) {
            next('/login');
            return;
        }
        next();
    }
});

export default router;
