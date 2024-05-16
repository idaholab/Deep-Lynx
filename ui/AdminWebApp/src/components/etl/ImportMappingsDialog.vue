<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("typeMappings.import")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('typeMappings.importFromFile')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-form
              ref="form"
              lazy-validation
            >
              <v-file-input accept="application/json" :label="$t('general.jsonFile')" @change="addFile"></v-file-input>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false; reset()" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="uploadMappings">{{$t("imports.import")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'

  interface ImportMappingsDialogModel {
    errorMessage: string;
    dialog: boolean;
    fileToUpload: File | null;
  }

  export default Vue.extend ({
    name: 'ImportMappingsDialog',

    props: {
      containerID: {type: String, required: true},
      dataSourceID: {type: String, required: true},
    },

    data: (): ImportMappingsDialogModel => ({
      errorMessage: "",
      dialog: false,
      fileToUpload: null,
    }),

    methods: {
      addFile(file: File) {
        this.fileToUpload = file
      },
      reset() {
        this.fileToUpload = null
      },
      uploadMappings() {
        if(this.fileToUpload) {
          this.$client.importTypeMappings(this.containerID, this.dataSourceID, this.fileToUpload)
          .then((results) => {
            this.dialog = false
            this.errorMessage = ""

            this.$emit('mappingsImported', results)
          })
          .catch((e: any) => this.errorMessage = e)
        }
      }
    }
  });
</script>
