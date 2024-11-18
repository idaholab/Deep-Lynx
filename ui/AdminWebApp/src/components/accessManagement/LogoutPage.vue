<template>
  <div style="width: 100%;" class="d-flex mt-4">
    <v-btn text class="mr-auto d-inline" @click="logout">{{$t('general.logout')}}</v-btn>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import Config from '@/config'

  export default Vue.extend ({
    name: 'LogoutPage',

    methods: {
      logout() {
        this.$auth.Logout()
        window.location.href = `${Config.deepLynxApiUri}/logout`;
      }
    }
  })
</script>
