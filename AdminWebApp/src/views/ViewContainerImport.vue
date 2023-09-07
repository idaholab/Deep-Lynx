<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('imports.containerTitle')}}</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <success-banner :message="successMessage" :timeout="25000"></success-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('imports.containerDescription')}}</p>
            <p>{{$t('warnings.importContainer')}}</p>

              <v-checkbox v-model="importOntology">
                <template v-slot:label>
                  {{$t('ontology.ontology')}} <p class="text-caption" style="margin-left: 5px"> {{$t('general.beta')}}</p>
                </template>

                <template v-slot:prepend><info-tooltip :message="$t('help.importOntology')"></info-tooltip> </template>
              </v-checkbox>

            <v-checkbox v-model="importDataSources">
                <template v-slot:label>
                  {{$t('dataSources.dataSources')}} <p class="text-caption" style="margin-left: 5px"> {{$t('general.beta')}}</p>
                </template>

                <template v-slot:prepend><info-tooltip :message="$t('help.importDataSource')"></info-tooltip> </template>
              </v-checkbox>

            <v-checkbox v-model="importTypeMappings" :disabled="!importDataSources">
                <template v-slot:label>
                  {{$t('typeMappings.transformations')}} <p class="text-caption" style="margin-left: 5px"> {{$t('general.beta')}}</p>
                </template>

                <template v-slot:prepend><info-tooltip :message="$t('help.importTypeMapping')"></info-tooltip> </template>
              </v-checkbox>

          </v-col>
        </v-row>


      </v-card-text>

      <v-card-actions>
        <v-file-input @change="addFile">
          <template v-slot:label>
            Container export (.json) file
          </template>
        </v-file-input>

        <v-btn color="primary" class="mt-2" text @click="importContainer" :disabled="!importSelected || !importFile"><span v-if="!loading">{{$t("imports.fromFile")}}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ContainerT} from "@/api/types";
  import buildURL from "build-url";
  import Config from "@/config";
  import {AxiosBasicCredentials, AxiosRequestConfig, AxiosResponse, default as axios} from "axios";
  import {RetrieveJWT} from "@/auth/authentication_service";

  interface ContainerImportModel {
    errorMessage: string,
    successMessage: string,
    loading: boolean,
    valid: boolean,
    importOntology: boolean,
    importDataSources: boolean,
    importTypeMappings: boolean,
    importSelected: boolean,
    container: ContainerT | undefined,
    importFile: File | null
  }

  export default Vue.extend ({
    name: 'ViewContainerImport',

    data: (): ContainerImportModel => ({
      errorMessage: "",
      successMessage: "",
      loading: false,
      valid: true,
      importOntology: false,
      importDataSources: false,
      importTypeMappings: false,
      importSelected: false,
      container: undefined,
      importFile: null
    }),

    watch: {
      importOntology: 'updateImportSelected',
      importDataSources: ['updateImportSelected', 'updateDataSourcesExport'],
      importTypeMappings: 'updateImportSelected',
    },

    methods: {
      updateImportSelected() {
        this.importSelected = this.importOntology || this.importDataSources || this.importTypeMappings;
      },
      updateDataSourcesExport() {
        if (this.importDataSources === false) this.importTypeMappings = false;
      },
      addFile(file: File) {
        this.importFile = file;
      },
      importContainer() {
        this.loading = true;
        const config: AxiosRequestConfig = {}
        config.headers = {"Access-Control-Allow-Origin": "*"}

        if(Config?.deepLynxApiAuth === "token") {
          config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
        }

        if(Config?.deepLynxApiAuth === "basic") {
          config.auth = {username: Config.deepLynxApiAuthBasicUser, password: Config.deepLynxApiAuthBasicPass} as AxiosBasicCredentials
        }

        config.validateStatus = () => {
          return true;
        };

        const queryParams: {[key: string]: any} = {}
        if (this.importOntology) queryParams.importOntology = true
        if (this.importDataSources) queryParams.importDataSources = true
        if (this.importTypeMappings) queryParams.importTypeMappings = true

        const url = buildURL(Config?.deepLynxApiUri, {path: `/containers/${this.container?.id!}/import`, queryParams: queryParams})

        const formData = new FormData();
        formData.append('export_file', this.importFile!);

        axios.post(url, formData, config)
            .then((response: AxiosResponse) => {
              if(response.status > 299 || response.status < 200) {
                const error = JSON.parse(response.data.error).error;
                this.errorMessage = `${this.$t('imports.containerError')}. ${error}`;
              } else {
                this.successMessage = `${response.data.value} ${this.$t('warnings.inactiveMappings')}`;
              }
            })
            .catch((e: any) => {
              this.errorMessage = e;
            })
            .finally(() => this.loading = false)
      }
    },

    beforeMount() {
      this.container = this.$store.getters.activeContainer;
    }
  });
</script>
