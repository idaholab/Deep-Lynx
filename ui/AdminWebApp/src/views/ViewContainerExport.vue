<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('exports.containerTitle')}}</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('exports.containerDescription')}}</p>

              <v-checkbox v-model="exportOntology">
                <template v-slot:label>
                  {{$t('ontology.ontology')}} <p class="text-caption" style="margin-left: 5px"> {{$t('general.beta')}}</p>
                </template>

                <template v-slot:prepend><info-tooltip :message="$t('help.exportOntology')"></info-tooltip> </template>
              </v-checkbox>

            <v-checkbox v-model="exportDataSources">
                <template v-slot:label>
                  {{$t('dataSources.dataSources')}} <p class="text-caption" style="margin-left: 5px"> {{$t('general.beta')}}</p>
                </template>

                <template v-slot:prepend><info-tooltip :message="$t('help.exportDataSource')"></info-tooltip> </template>
              </v-checkbox>

            <v-checkbox v-model="exportTypeMappings" :disabled="!exportDataSources">
                <template v-slot:label>
                  {{$t('typeMappings.transformations')}} <p class="text-caption" style="margin-left: 5px"> {{$t('general.beta')}}</p>
                </template>

              <template v-slot:prepend><info-tooltip :message="$t('help.exportTypeMapping')"></info-tooltip> </template>
              </v-checkbox>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" class="mt-2" text @click="exportContainer" :disabled="!exportSelected"><span v-if="!loading">{{$t("exports.toFile")}}</span>
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

  interface ContainerExportModel {
    errorMessage: string,
    successMessage: string,
    loading: boolean,
    valid: boolean,
    exportOntology: boolean,
    exportDataSources: boolean,
    exportTypeMappings: boolean,
    exportSelected: boolean,
    container: ContainerT | undefined
  }

  export default Vue.extend ({
    name: 'ViewContainerExport',

    data: (): ContainerExportModel => ({
      errorMessage: "",
      successMessage: "",
      loading: false,
      valid: true,
      exportOntology: false,
      exportDataSources: false,
      exportTypeMappings: false,
      exportSelected: false,
      container: undefined
    }),

    watch: {
      exportOntology: 'updateImportSelected',
      exportDataSources: ['updateImportSelected', 'updateDataSourcesExport'],
      exportTypeMappings: 'updateImportSelected',
    },

    methods: {
      updateImportSelected() {
        this.exportSelected = this.exportOntology || this.exportDataSources || this.exportTypeMappings;
      },
      updateDataSourcesExport() {
        if (this.exportDataSources === false) this.exportTypeMappings = false;
      },
      exportContainer() {
        this.loading = true;
        const config: AxiosRequestConfig = {}
        config.responseType = "blob"
        config.headers = {"Access-Control-Allow-Origin": "*"}


        if(Config?.deepLynxApiAuth === "basic") {
          config.auth = {username: Config.deepLynxApiAuthBasicUser, password: Config.deepLynxApiAuthBasicPass} as AxiosBasicCredentials
        }

        const queryParams: {[key: string]: any} = {ontologyVersionID: this.$store.getters.currentOntologyVersionID}
        if (this.exportOntology) queryParams.exportOntology = true
        if (this.exportDataSources) queryParams.exportDataSources = true
        if (this.exportTypeMappings) queryParams.exportTypeMappings = true

        const url = buildURL(Config?.deepLynxApiUri, {path: `/containers/${this.container?.id!}/export`, queryParams: queryParams})

        axios.get(url, config)
            .then((response: AxiosResponse) => {
              if(response.status > 299 || response.status < 200) {
                this.errorMessage = this.$t('exports.downloadError') as string
              } else {
                const fetchedURL = window.URL.createObjectURL(new Blob([response.data]))
                const link = document.createElement('a')

                link.href = fetchedURL
                link.setAttribute('download', `${this.container?.name}_Container_Export.json`)
                document.body.append(link)
                link.click()
              }
            })
            .catch((e: any) => this.errorMessage = e)
            .finally(() => this.loading = false)
      }
    },

    beforeMount() {
      this.container = this.$store.getters.activeContainer
    }
  });
</script>
