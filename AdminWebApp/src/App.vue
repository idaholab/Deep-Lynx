<template>
  <v-app>
    <v-main>
        <router-view/>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'

@Component({name: 'App'})
export default class App extends Vue {
}
</script>


<style lang="scss">
.my-app.v-application {
  color: $text;
}

.v-btn {
  text-transform: none !important;
  letter-spacing: normal !important
}

.theme--light.v-icon {
    color: $primary !important;
}

.theme--light.v-text-field {

  & > .v-input__control > .v-input__slot:before {
    border-color: $primary !important;
  }

  &.error--text > .v-input__control > .v-input__slot:before {
    border-color: $error !important;
  }
}
</style>
