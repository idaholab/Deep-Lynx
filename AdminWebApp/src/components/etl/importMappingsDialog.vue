<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("importMapping.importMappings")}}</v-btn>
    </template>

    <v-card>
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('importMapping.title')}}</span>
          <v-row>
            <v-col :cols="12">
              <v-form
                  ref="form"
                  lazy-validation
              >
                <v-file-input label=".json File" @change="addFile"></v-file-input>
              </v-form>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false; reset()" >{{$t("exportMapping.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="uploadMappings">{{$t("importMapping.importFromFile")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class ImportMappingsDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  dataSourceID!: string;

  errorMessage = ""
  dialog = false
  fileToUpload: File | null = null

  addFile(file: File) {
    this.fileToUpload = file
  }

  reset() {
    this.fileToUpload = null
  }

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
</script>