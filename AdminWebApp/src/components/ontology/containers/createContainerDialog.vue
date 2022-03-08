<template>
    <v-dialog v-model="dialog" max-width="500px" @click:outside="clearNew">
        <template v-slot:activator="{ on }">
            <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("containers.newContainerButton")}}</v-btn>
        </template>
        <v-card>
            <v-card-title>
                <span class="headline">{{$t("containers.formTitle")}}</span>
            </v-card-title>

            <v-card-text>
                <error-banner :message="errorMessage"></error-banner>
                <v-container>
                    <v-row>
                        <v-col :cols="12">

                            <v-form
                                    ref="form"
                                    lazy-validation
                            >
                                <v-text-field
                                        v-model="newContainer.name"
                                        :label="$t('containers.name')"
                                        required
                                ></v-text-field>
                                <v-textarea
                                        :rows="2"
                                        v-model="newContainer.description"
                                        :label="$t('containers.description')"
                                        required
                                ></v-textarea>
                              <v-file-input @change="addFile">
                                <template v-slot:label>
                                  {{$t('containers.owlFile')}} <small>({{$t('containers.optional')}})</small>
                                </template>
                                <template v-slot:append-outer><info-tooltip :message="$t('containers.owlFileHelp')"></info-tooltip> </template>
                              </v-file-input>
                              <v-row class="my-8 mx-0" align="center">
                                <v-divider></v-divider>
                                <span class="px-2">{{$t('containers.or')}}</span>
                                <v-divider></v-divider>
                              </v-row>
                              <v-text-field v-model="owlFilePath">
                                <template v-slot:label>
                                  {{$t('containers.urlOwlFile')}} <small>({{$t('containers.optional')}})</small>
                                </template>
                                <template slot="append-outer"><info-tooltip :message="$t('containers.owlUrlHelp')"></info-tooltip> </template>
                              </v-text-field>
                              <!-- Uncomment once we actually have versioning
                              <v-checkbox v-model="newContainer.config.data_versioning_enabled">
                                <template v-slot:label>
                                  {{$t('containers.dataVersioningEnabled')}}
                                </template>

                                <template slot="append-outer"><info-tooltip :message="$t('containers.dataVersioningHelp')"></info-tooltip> </template>
                              </v-checkbox>
                              -->
                            </v-form>
                        </v-col>
                    </v-row>
                </v-container>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" text @click="clearNew" >{{$t("home.cancel")}}</v-btn>
              <v-btn color="blue darken-1" text @click="createContainer" ><span v-if="!loading">{{$t("home.save")}}</span>
                <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
              </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
   import {Component, Vue} from 'vue-property-decorator'

    @Component
    export default class CreateContainerDialog extends Vue {
        errorMessage = ""
        loading = false
        dialog = false
        newContainer = {
          name: null,
          description:null, config: {
          data_versioning_enabled: true,
          ontology_versioning_enabled: false,
          }}
      owlFilePath = ""
        owlFile: File | null = null

        addFile(file: File) {
          this.owlFile = file
        }

        clearNew() {
            this.newContainer = {
              name: null,
              description:null, config: {
                data_versioning_enabled: true,
                ontology_versioning_enabled: false,
              }}
            this.dialog = false
        }

        createContainer() {
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
                  this.errorMessage = e
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
                  this.errorMessage = e
                })
          }
        }
    }
</script>
