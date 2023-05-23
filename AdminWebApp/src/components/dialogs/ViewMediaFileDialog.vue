<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="close()">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-eye</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("general.view")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("general.view")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <slot />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="close" >{{$t("general.close")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"

@Component
export default class ViewMediaFileDialog extends Vue {
  @Prop({required: false, default: true})
  readonly icon!: boolean

  errorMessage = ""
  dialog= false
  valid = true
  fileToUpload: File | null = null

  close() {
    this.dialog = false;
  }

}
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>
