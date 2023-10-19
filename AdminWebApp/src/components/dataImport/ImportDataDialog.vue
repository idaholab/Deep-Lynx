<template>
  <v-dialog v-model="dialog" max-width="500px">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" :disabled="disabled" dark class="mt-1" v-on="on">{{$t('imports.data')}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('imports.dataDescription')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-form ref="form" lazy-validation>
              <v-file-input
                :label="$t('imports.fileTypes')"
                @change="addFiles"
              />
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clear" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="uploadImport" ><div v-if="!loading">{{$t("general.upload")}}</div><div v-else>
          <v-progress-circular indeterminate></v-progress-circular>
        </div></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'

  interface ImportDataDialogModel {
    filesToUpload:  File | null;
    errorMessage: string;
    loading: boolean;
    dialog: boolean;
  }

  export default Vue.extend ({
    name: 'ImportDataDialog',

    props: {
      dataSourceID: {required: true, type: String},
      containerID: {required: true, type: String},
      disabled: {required: false, default: false, type: Boolean},
      fastload: {required: false, default: false, type: Boolean},
    },

    data: (): ImportDataDialogModel => ({
      filesToUpload: null,
      errorMessage: "",
      loading: false,
      dialog: false
    }),

    methods: {
      addFiles(files: File) {
        this.filesToUpload = files
      },
      clear() {
        this.dialog = false
        this.errorMessage = ""
      },
      uploadImport() {
        this.loading = true
        if(this.filesToUpload) {
          this.$client.dataSourceJSONFileImport(this.containerID, this.dataSourceID, this.filesToUpload, this.fastload)
              .then(() => {
                  this.dialog = false
                  this.errorMessage = ""

                  this.$emit('importUploaded')
              })
              .catch(e => {e.error ? this.errorMessage = e.error : this.errorMessage = e})
              .finally(() => this.loading = false)
        }
      }
    }
  })
</script>
