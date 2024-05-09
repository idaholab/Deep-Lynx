<template>
  <v-app>
    <v-main>
        <router-view/>
    </v-main>
  </v-app>
</template>

<style lang="scss">
.my-app.v-application {
  color: $text;
}

.v-btn {
  text-transform: none !important;
  letter-spacing: normal !important
}

.v-tab {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  background-color: lighten($primary, 35%);
  transition: all .3s;
  border: 2px solid white;
  color: $darkgray2 !important;
  border-top: none;
  border-bottom: none;
  border-left: none;

  &:last-of-type {
    border-right: none;
  }

  &.v-tab--active {
    background-color: $primary;
    color: white !important;
    transition: all .3s;
  }
}

.v-tabs-slider-wrapper {
  display: none;
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
