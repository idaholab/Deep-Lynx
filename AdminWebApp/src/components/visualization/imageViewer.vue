<template>
  <v-dialog
      v-model="dialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
  >
    <template v-slot:activator="{ on }">
      <v-icon v-if="icon" small class="mr-2" v-on="on">mdi-eye</v-icon>
    </template>

    <v-card id="dialog">
      <v-toolbar
          dark
          color="warning"
          flat
          tile
      >
        <v-btn
            icon
            dark
            @click="dialog = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{file.file_name}}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-img
          id="image"
          :src="imageURL"
          contain
          :height="imageHeight"
          v-observe-visibility="determineHeight"
      >
        <template v-slot:placeholder v-if="loading">
          <v-row
              class="fill-height ma-0"
              align="center"
              justify="center"
          >
            <v-progress-circular
                indeterminate
                color="grey lighten-5"
            ></v-progress-circular>
          </v-row>
        </template>
      </v-img>
    </v-card>

  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator";
import {FileT} from "@/api/types";
import Config from "@/config";

@Component({components: {}})
export default class ImageViewer extends Vue {
  @Prop({required: true})
  readonly file!: FileT

  @Prop({required: false, default: true})
  readonly icon!: boolean

  dialog = false
  loading = false
  imageHeight = 500

  determineHeight() {
    const timeseriesDialog = document.getElementById('dialog') as HTMLElement;
    if (timeseriesDialog) this.imageHeight = timeseriesDialog.clientHeight - 80 // account for dialog header
  }

  get imageURL(): string {
    const token = localStorage.getItem('user.token');

    const imageUrl = new URL(`${Config.deepLynxApiUri}/containers/${this.file.container_id}/files/${this.file.id}/download`);
    imageUrl.searchParams.append("auth_token", token!);
    return imageUrl.toString()
  }

}
</script>