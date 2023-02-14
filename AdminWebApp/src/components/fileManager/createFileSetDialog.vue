<template>
  <v-dialog v-model="dialog" max-width="80%" @click:outside="errorMessage = ''; dialog = false; clearNewFileSet()">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mt-2" v-on="on">{{$t("fileManager.newFileSet")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("fileManager.createFileSet")}}</span>
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
                  label="WebGL Files"
                  @change="addFiles"
                  v-model="filesToUpload"
                  :rules="[v => v ? v.length > 0 || $t('fileManager.filesRequired') : '']"
              ></v-file-input>

              <v-text-field
                  v-model="tagName"
                  :label="$t('fileManager.tagName')"
                  :rules="[v => !!v || $t('fileManager.tagRequired')]"
              ></v-text-field>

            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="clearNewFileSet" >{{$t("home.cancel")}}</v-btn>
        <v-btn
            color="blue darken-1"
            text
            @click="createFileSet" >
          {{$t("home.create")}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"
import {
  ContainerT
} from "@/api/types";

@Component
export default class CreateFileSetDialog extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  dialog= false
  valid = true
  tagName = ""
  container: ContainerT | undefined = undefined;
  filesToUpload: File[] | null = null


  beforeMount() {
    this.container = this.$store.getters.activeContainer;
  }

  addFiles(files: File[]) {
    this.filesToUpload = files;
  }

  createFileSet() {
    // @ts-ignore
    if(!this.$refs.form!.validate()) return;

    console.log('Create file set')
    this.clearNewFileSet();
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
