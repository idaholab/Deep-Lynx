<template>
  <v-card>
    <v-toolbar flat color="white">
      <v-toolbar-title>{{$t('home.ontologyUpdateDescription')}}</v-toolbar-title>
    </v-toolbar>

    <v-card-text>
      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <div>
        <v-row>
          <v-col :cols="12">
            <v-form
              ref="form"
              lazy-validation
            >
              <v-file-input 
                @change="addFile"
                :rules="[v => !!v || 'Please select one']">
                <template v-slot:label>
                  .owl File
                </template>
                <template v-slot:append-outer><info-tooltip :message="$t('containers.owlFileHelp')"></info-tooltip> </template>
              </v-file-input>
              <v-row class="my-8 mx-0" align="center">
                <v-divider></v-divider>
                <span class="px-2">or</span>
                <v-divider></v-divider>
              </v-row>
              <v-text-field v-model="owlFilePath"
                :rules="[v => !!v || 'Please select one']">
                <template v-slot:label>
                  URL to .owl File
                </template>
                <template slot="append-outer"><info-tooltip :message="$t('containers.owlUrlHelp')"></info-tooltip> </template>
              </v-text-field>
            </v-form>
          </v-col>
        </v-row>
      </div>
    </v-card-text>

    <v-card-actions>
        <v-spacer></v-spacer>
      <v-btn color="blue darken-1" text @click="updateContainer" ><span v-if="!loading">{{$t("home.save")}}</span>
        <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'

@Component
export default class OntologyUpdate extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  errorMessage = ""
  successMessage = ""
  loading = false
  owlFilePath = ""
  owlFile: File | null = null

  addFile(file: File) {
    this.owlFile = file
  }

  updateContainer() {
    this.loading = true

    if(this.owlFile || this.owlFilePath !== "") {
      this.$client.updateContainerFromImport(this.containerID, this.owlFile, this.owlFilePath)
          .then(() => {
            this.loading = false
            this.successMessage = "Container updated successfully"
            this.errorMessage = ""
          })
          .catch(e => {
            this.loading = false
            this.errorMessage = e
          })
    } else {
      this.errorMessage = "Please select either an ontology file or valid URL to an ontology file"
      this.loading = false
    }
  }
}
</script>
