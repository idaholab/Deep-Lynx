<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('containerExport.pageTitle')}}</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('containerExport.pageDescription')}}</p>

              <v-checkbox v-model="exportOntology">
                <template v-slot:label>
                  {{$t('containerExport.exportOntology')}} <p class="text-caption" style="margin-left: 5px"> {{$t('beta')}}</p>
                </template>

                <template slot="prepend"><info-tooltip :message="$t('containerExport.exportOntologyHelp')"></info-tooltip> </template>
              </v-checkbox>

            <v-checkbox disabled>
                <template v-slot:label>
                  {{$t('containerExport.exportDataSources')}} <p class="text-caption" style="margin-left: 5px"> {{$t('comingSoon')}}</p>
                </template>
              </v-checkbox>

            <v-checkbox disabled>
                <template v-slot:label>
                  {{$t('containerExport.exportTypeMappings')}} <p class="text-caption" style="margin-left: 5px"> {{$t('comingSoon')}}</p>
                </template>
              </v-checkbox>

          </v-col>
        </v-row>


      </v-card-text>

      <v-card-actions>
        <v-btn color="blue darken-1" class="mt-2" text @click="exportContainer" :disabled="!exportOntology"><span v-if="!loading">{{$t("containerExport.export")}}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator'
import {ContainerT} from "@/api/types";
import DeleteContainerDialog from "@/components/ontology/containers/deleteContainerDialog.vue";
import SelectDataSourceTypes from "@/components/dataSources/selectDataSourceTypes.vue";
import buildURL from "build-url";
import Config from "@/config";
import {AxiosBasicCredentials, AxiosRequestConfig, AxiosResponse, default as axios} from "axios";
import {RetrieveJWT} from "@/auth/authentication_service";

@Component({components: {DeleteContainerDialog, SelectDataSourceTypes}})
export default class ContainerExport extends Vue {
  container: ContainerT | undefined = undefined
  errorMessage = ""
  successMessage = ""
  loading = false
  valid = true
  exportOntology = false

  beforeMount() {
    this.container = this.$store.getters.activeContainer
  }


  exportContainer() {
    this.loading = true;
    const config: AxiosRequestConfig = {}
    config.responseType = "blob"
    config.headers = {"Access-Control-Allow-Origin": "*"}

    if(Config?.deepLynxApiAuth === "token") {
      config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
    }

    if(Config?.deepLynxApiAuth === "basic") {
      config.auth = {username: Config.deepLynxApiAuthBasicUser, password: Config.deepLynxApiAuthBasicPass} as AxiosBasicCredentials
    }

    const url = buildURL(Config?.deepLynxApiUri, {path: `/containers/${this.container?.id!}/ontology/export`, queryParams: {ontologyVersionID: this.$store.getters.currentOntologyVersionID}})

    axios.get(url, config)
        .then((response: AxiosResponse) => {
          if(response.status > 299 || response.status < 200) {
            this.errorMessage = `Unable to download exported type mappings`
          } else {
            const fetchedURL = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')

            link.href = fetchedURL
            link.setAttribute('download', `${this.container?.name}_Ontology_Export.json`)
            document.body.append(link)
            link.click()
          }
        })
        .catch((e: any) => this.errorMessage = e)
        .finally(() => this.loading = false)
  }

}
</script>
