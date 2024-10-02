<template>
  <v-dialog v-model="dialog" width="40%" @click:outside="clearNew">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mt-2" v-on="on">{{$t("containers.createNew")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("containers.new")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">

            <v-form
                ref="form"
                lazy-validation
                v-model="valid"
            >
              <v-text-field
                  v-model="newContainer.name"
                  :label="$t('general.name')"
                  :rules="[validationRule]"
                  required
              ></v-text-field>
              <v-textarea
                  :rows="2"
                  v-model="newContainer.description"
                  :label="$t('general.description')"
                  :rules="[validationRule]"
                  required
              ></v-textarea>
              <v-file-input @change="addFile">
                <template v-slot:label>
                  {{$t('ontology.owlFile')}} <small>({{$t('general.optional')}})</small>
                </template>
                <template v-slot:append-outer><info-tooltip :message="$t('help.owlFile')"></info-tooltip> </template>
              </v-file-input>

              <p>{{$t('help.needHelp')}} <a :href="importHelpLink()">{{$t('general.wiki')}}</a> </p>
              <v-row class="my-8 mx-0" align="center">
                <v-divider></v-divider>
                <span class="px-2">{{$t('general.or')}}</span>
                <v-divider></v-divider>
              </v-row>
              <v-text-field v-model="owlFilePath">
                <template v-slot:label>
                  {{$t('ontology.urlOwlFile')}} <small>({{$t('general.optional')}})</small>
                </template>
                <template slot="append-outer"><info-tooltip :message="$t('help.owlUrl')"></info-tooltip> </template>
              </v-text-field>

              <v-checkbox v-model="newContainer.config.ontology_versioning_enabled">
                <template v-slot:label>
                  {{$t('ontology.versioningEnabled')}}<p class="text-caption" style="margin-left: 5px"> {{$t('general.beta')}}</p>
                </template>

                <template v-slot:prepend><info-tooltip :message="$t('help.ontologyVersioning')"></info-tooltip> </template>
              </v-checkbox>

              <SelectDataSourceTypes @selected="setDataSources"></SelectDataSourceTypes>

              <br>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="clearNew" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="createContainer" ><span v-if="!loading">{{$t("general.save")}}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'
  import SelectDataSourceTypes from "@/components/dataSources/SelectDataSourceTypes.vue";

  interface CreateContainerDialogModel {
    valid: boolean
    errorMessage: string
    loading: boolean
    dialog: boolean
    newContainer: {
      name: string | null,
      description: string | null, config: {
        data_versioning_enabled: boolean,
        ontology_versioning_enabled: boolean,
        enabled_data_sources: string[]
    }}
    owlFilePath: string
    owlFile: File | null
  }

  export default Vue.extend ({
    name: 'CreateContainerDialog',

    components: { SelectDataSourceTypes },

    data: (): CreateContainerDialogModel => ({
      valid: false,
      errorMessage: "",
      loading: false,
      dialog: false,
      newContainer: {
        name: null,
        description: null, config: {
          data_versioning_enabled: true,
          ontology_versioning_enabled: false,
          enabled_data_sources: []
      }},
      owlFilePath: "",
      owlFile: null
    }),

    methods: {
      addFile(file: File) {
        this.owlFile = file
      },
      clearNew() {
        this.newContainer = {
          name: null,
          description:null, config: {
            data_versioning_enabled: true,
            ontology_versioning_enabled: false,
            enabled_data_sources: []
          }}
        this.dialog = false
      },
      createContainer() {
        // @ts-ignore
        if(!this.$refs.form!.validate()) return;

        this.loading = true

        if(this.owlFile || this.owlFilePath !== "") {
          this.$client.containerFromImport(this.newContainer, this.owlFile, this.owlFilePath)
              .then((container) => {
                this.loading = false
                this.clearNew()
                this.$emit("containerCreated", container)

                this.dialog = false
                this.errorMessage = ""
              })
              .catch(e => {
                this.loading = false
                this.dialog = false

                if (typeof(e) === "object") {
                  if (e.detail) {
                    if (e.detail.toLowerCase().includes('already exists')) {
                      this.$emit("error", `${this.$t('errors.containerCreation')} ${this.$t('errors.containerName')}`)
                    } else {
                      this.$emit("error", `${this.$t('errors.containerCreation')} ${e.detail}`)
                    }
                  } else {
                    let errorStr = '';
                    for (const [key, value] of Object.entries(e)) {
                      errorStr += key + ": " + value + " ";
                    }
                    this.$emit("error", `${this.$t('errors.containerCreation')} ${errorStr} ${this.$t('errors.checkLogs')}`)
                  }
                } else {
                  this.$emit("error", `${this.$t('errors.loadOntology')} ${e}` )
                }
              })
        } else {
          this.$client.createContainer(this.newContainer)
              .then((container) => {
                this.loading = false
                this.clearNew()
                this.$emit("containerCreated", container[0].id)

                this.$store.commit('setActiveContainer', container[0])
                this.dialog = false
                this.errorMessage = ""
              })
              .catch(e => {
                this.loading = false

                if (typeof(e) === 'string' && e.includes('{')) {
                  const eObj = JSON.parse(e)
                  if (eObj.error && eObj.error.detail) {
                    this.errorMessage = eObj.error.detail
                  } else {
                    this.errorMessage = e
                  }
                } else {
                  this.errorMessage = e
                }
              })
        }
      },
      setDataSources(sources: string[]) {
        this.newContainer.config.enabled_data_sources = sources
      },
      importHelpLink() {
        return this.$t('links.importOntology')
      },
      validationRule(v: any) {
        return !!v || this.$t('validation.required')
      }
    }
  });
</script>
