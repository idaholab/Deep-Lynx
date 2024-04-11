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
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
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
                  :rules="[validateFileInput]"
              ></v-file-input>

              <v-text-field
                  v-model="tagName"
                  :label="$t('tags.name')"
                  :rules="[validateTextField]"
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
  import Vue from 'vue'

  interface CreateFileSetDialogModel {
    filesToUpload: File[] | null;
    errorMessage: string;
    dialog: boolean;
    valid: boolean;
    tagName: string;
    filesLoading: boolean;
  }

  interface VForm extends Vue {
    validate: () => boolean;
  }

  export default Vue.extend ({
    name: 'CreateFileSetDialog',

    props: {
      containerID: {required: true, type: String},
    },

    data: (): CreateFileSetDialogModel => ({
      filesToUpload: null,
      errorMessage: "",
      dialog: false,
      valid: true,
      tagName: "",
      filesLoading: false
    }),

    methods: {
      addFiles(files: File[]) {
        this.filesToUpload = files;
      },
      createFileSet() {
        const form = this.$refs.form as VForm;
        if(!form.validate()) return;

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

      },
      clearNewFileSet() {
        this.tagName = "";
        this.addFiles([]);
        this.dialog = false;
      },
      validateFileInput(v: File[] | null): boolean | string {
        return v ? v.length > 0 || this.$t('validation.required') : '';
      },
      validateTextField(v: string): boolean | string {
          return !!v || this.$t('validation.required');
      }
    }
  });
</script>

<style lang="scss">
.v-expansion-panel-header__icon .v-icon__svg {
  color: white;
}
</style>