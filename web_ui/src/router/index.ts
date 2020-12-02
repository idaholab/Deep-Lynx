import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '@/pages/Home.vue'
import ContainerSelect from '@/pages/ContainerSelect.vue'
import Login from '@/pages/Login.vue'
import {IsLoggedIn, LoginFromToken} from "@/auth/authentication_service";
import ContainerInvite from "@/pages/ContainerInvite.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'ContainerSelect',
    component: ContainerSelect
  },
  {
    path: '/containers/:containerID',
    name: 'Home',
    component: Home,
    props: true
  },
  {
    path: '/containers/:containerID/:view',
    name: 'Home',
    component: Home,
    props: true
  },
  {
   path: '/container-invite',
   name: 'ContainerInvite',
   component: ContainerInvite
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '*',
    redirect: '/'
  }
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

router.beforeEach((to, from, next) => {
  const publicPages = ['/login', '/reset-password', '/validate', '/register', '/container-invite']
  const authRequired = !publicPages.includes(to.path)

  // if main route we need to check if this is a redirect by checking
  // the presence of a JWT
  if(to.path === '/' && to.query.token) {
    LoginFromToken(to.query.token as string, to.query.state as string)
    .then(result => {
        if(result) {
          next('/');
          return
        }

        next('/login')
    })
        .catch(() => next('login'))
  } else {
    if(authRequired && !IsLoggedIn()) {
      next('/login')
      return
    }
    next()
  }
})

export default router
