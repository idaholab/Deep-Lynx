<template>
  <v-dialog v-model="dialog" max-width="500px">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" :disabled="disabled" dark class="mt-1" v-on="on">Import Data</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">Import Data (csv, json, and xml accepted)</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-form ref="form" lazy-validation>
              <v-file-input 
                label=".json, .xml, .csv" 
                @change="addFiles"
              />
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clear" >{{$t("home.cancel")}}</v-btn>
        <v-btn color="primary" text @click="uploadImport" ><div v-if="!loading">{{$t("home.upload")}}</div><div v-else>
          <v-progress-circular indeterminate></v-progress-circular>
        </div></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import {Component, Prop, Vue} from 'vue-property-decorator'

  @Component
  export default class ImportDataDialog extends Vue {
    @Prop({required: true})
    readonly dataSourceID!: string

    @Prop({required: true})
    readonly containerID!: string

    @Prop({required: false, default: false})
    disabled!: boolean

    @Prop({required: false, default: false})
    fastload!: boolean

    errorMessage = ""
    loading = false
    dialog = false
    filesToUpload: File | null = null

    addFiles(files: File) {
      this.filesToUpload = files
    }

    clear() {
      this.dialog = false
      this.errorMessage = ""
    }

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
</script>
