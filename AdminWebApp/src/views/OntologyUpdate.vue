<template>
  <v-card>
    <v-toolbar flat color="white">
      <v-toolbar-title>{{$t('ontology.updateDescription')}}</v-toolbar-title>
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
                :rules="[v => !!v || $t('validation.selectOne')]">
                <template v-slot:label>
                  .owl File
                </template>
                <template v-slot:append-outer><info-tooltip :message="$t('help.owlFile')"></info-tooltip> </template>
              </v-file-input>
              <v-row class="my-8 mx-0" align="center">
                <v-divider></v-divider>
                <span class="px-2">or</span>
                <v-divider></v-divider>
              </v-row>
              <v-text-field v-model="owlFilePath"
                :rules="[v => !!v || $t('validation.selectOne')]">
                <template v-slot:label>
                  URL to .owl File
                </template>
                <template slot="append-outer"><info-tooltip :message="$t('help.owlUrl')"></info-tooltip> </template>
              </v-text-field>

              <br>
              <p>{{$t('help.needHelp')}} <a :href="importHelpLink()">{{$t('general.wiki')}}</a> </p>
            </v-form>
          </v-col>
        </v-row>
      </div>
    </v-card-text>

    <v-card-actions>
        <v-spacer></v-spacer>
      <v-btn color="primary" text @click="updateContainer" ><span v-if="!loading">{{$t("general.save")}}</span>
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
      this.$client.updateContainerFromImport(this.containerID, this.owlFile, this.owlFilePath, this.$store.state.activeContainer?.name)
          .then(() => {
            this.loading = false
            this.errorMessage = ""
            this.$router.go(0)
          })
          .catch(e => {
            this.loading = false
            this.errorMessage = e
          })
    } else {
      this.errorMessage = (this.$t('errors.owl') as string)
      this.loading = false
    }
  }

  importHelpLink() {
    return this.$t('links.importOntology')
  }
}
</script>
