<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="clearNewFileSet()">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("fileManager.updateFile")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("fileManager.updateFile")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                v-model="valid"
                lazy-validation
            >

              <v-file-input
                  show-size
                  truncate-length="50"
                  :label="$t('fileManager.newFile')"
                  @change="changeFile"
                  v-model="fileToUpload"
                  :rules="[v => !!v || $t('fileManager.filesRequired')]"
              ></v-file-input>

            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clearNewFileSet" >{{$t("home.cancel")}}</v-btn>
        <v-btn
            color="primary"
            text
            @click="updateFile" >
          {{$t("home.save")}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"

@Component
export default class EditFileSetDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  @Prop({required: true})
  readonly file!: any;

  @Prop({required: false, default: true})
  readonly icon!: boolean

  errorMessage = ""
  dialog= false
  valid = true
  fileToUpload: File | null = null

  changeFile(file: File) {
    this.fileToUpload = file;
  }

  updateFile() {
    // @ts-ignore
    if(!this.$refs.form!.validate()) return;

    this.$client.updateWebGLFiles(this.containerID, this.file.file_id!, [this.fileToUpload!])
        .then(() => {
          this.$emit('fileUpdated');
          this.clearNewFileSet();
        })
        .catch(e => this.errorMessage = e)

  }

  clearNewFileSet() {
    this.fileToUpload = null;
    this.dialog = false;
  }

}
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>
