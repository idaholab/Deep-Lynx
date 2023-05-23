<template>
  <div style="width: 100%;" class="d-flex mt-4">
    <v-btn text class="mr-auto d-inline" @click="logout">{{$t('general.logout')}}</v-btn>
  </div>
</template>

<script lang="ts">
  import Config from '@/config'
  import {Component, Vue} from 'vue-property-decorator'

  @Component
  export default class Logout extends Vue {

    logout() {
      this.$auth.Logout()
      window.location.href = `${Config.deepLynxApiUri}/logout?redirect_uri=${Config.appUrl}`
    }
  }
</script>
