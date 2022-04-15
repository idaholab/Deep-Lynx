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

.height-full {
  height: 100% !important;
}

// Global: Changes weight of chevron arrow in JSON-viewer
.chevron-arrow {
  border-right: 2px solid black !important;
  border-bottom: 2px solid black !important;
}
</style>
