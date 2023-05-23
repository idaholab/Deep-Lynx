<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="errorMessage = ''; dialog = false; clearNewFileSet()">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mt-2" v-on="on">{{$t("files.createSet")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("files.newSet")}}</span>
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
                  chips
                  counter
                  multiple
                  show-size
                  truncate-length="50"
                  :label="$t('files.webGL')"
                  @change="addFiles"
                  v-model="filesToUpload"
                  :rules="[v => v ? v.length > 0 || $t('validation.required') : '']"
              ></v-file-input>

              <v-text-field
                  v-model="tagName"
                  :label="$t('tags.name')"
                  :rules="[v => !!v || $t('validation.required')]"
              ></v-text-field>

            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clearNewFileSet" >{{$t("general.cancel")}}</v-btn>
        <v-btn
            color="primary"
            text
            @click="createFileSet" >
          <span v-if="!filesLoading">{{$t("general.create")}}</span>
          <v-progress-circular indeterminate v-if="filesLoading"></v-progress-circular>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"

@Component
export default class CreateFileSetDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  dialog= false
  valid = true
  tagName = ""
  filesToUpload: File[] | null = null
  filesLoading = false

  addFiles(files: File[]) {
    this.filesToUpload = files;
  }

  createFileSet() {
    // @ts-ignore
    if(!this.$refs.form!.validate()) return;

    this.filesLoading = true;

    this.$client.createWebGLTagsAndFiles(this.containerID, this.filesToUpload!, this.tagName)
        .then(() => {
          this.$emit('fileSetCreated');
          this.clearNewFileSet();
        })
        .catch(e => this.errorMessage = e)
        .finally(() => {
          this.filesLoading = false;
        })

  }

  clearNewFileSet() {
    this.tagName = "";
    this.addFiles([]);
    this.dialog = false;
  }

}
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>
