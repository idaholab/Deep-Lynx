<template>
  <div>
    <v-card>
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('containerImport.pageTitle')}}</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-row>
          <v-col :cols="12">
            <p>{{$t('containerImport.pageDescription')}}</p>

              <v-checkbox v-model="importOntology">
                <template v-slot:label>
                  {{$t('containerImport.importOntology')}} <p class="text-caption" style="margin-left: 5px"> {{$t('beta')}}</p>
                </template>

                <template slot="prepend"><info-tooltip :message="$t('containerImport.importOntologyHelp')"></info-tooltip> </template>
              </v-checkbox>

            <v-checkbox v-model="importDataSources" disabled>
                <template v-slot:label>
                  {{$t('containerImport.importDataSources')}} <p class="text-caption" style="margin-left: 5px"> {{$t('comingSoon')}}</p>
                </template>
              </v-checkbox>

            <v-checkbox v-model="importTypeMappings" disabled>
                <template v-slot:label>
                  {{$t('containerImport.importTypeMappings')}} <p class="text-caption" style="margin-left: 5px"> {{$t('comingSoon')}}</p>
                </template>
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

        <v-btn color="blue darken-1" class="mt-2" text @click="importContainer" :disabled="!importSelected || !importFile"><span v-if="!loading">{{$t("containerImport.import")}}</span>
          <span v-if="loading"><v-progress-circular indeterminate></v-progress-circular></span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script lang="ts">
import {Component, Vue, Watch} from 'vue-property-decorator'
import {ContainerT} from "@/api/types";
import DeleteContainerDialog from "@/components/ontology/containers/deleteContainerDialog.vue";
import SelectDataSourceTypes from "@/components/dataSources/selectDataSourceTypes.vue";
import buildURL from "build-url";
import Config from "@/config";
import {AxiosBasicCredentials, AxiosRequestConfig, AxiosResponse, default as axios} from "axios";
import {RetrieveJWT} from "@/auth/authentication_service";

@Component({components: {DeleteContainerDialog, SelectDataSourceTypes}})
export default class ContainerImport extends Vue {
  container: ContainerT | undefined = undefined
  errorMessage = ""
  successMessage = ""
  loading = false
  valid = true
  importOntology = false
  importDataSources = false
  importTypeMappings = false
  importSelected = false
  importFile: File | null = null

  @Watch('importOntology')
  @Watch('importDataSources')
  @Watch('importTypeMappings')
  updateImportSelected() {
    this.importSelected = this.importOntology || this.importDataSources || this.importTypeMappings;
  }

  beforeMount() {
    this.container = this.$store.getters.activeContainer;
  }

  addFile(file: File) {
    this.importFile = file;
  }

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

    const url = buildURL(Config?.deepLynxApiUri, {path: `/containers/${this.container?.id!}/import`})

    const formData = new FormData();
    formData.append('export_file', this.importFile!);

    axios.post(url, formData, config)
        .then((response: AxiosResponse) => {
          if(response.status > 299 || response.status < 200) {
            const error = JSON.parse(response.data.error).error;
            this.errorMessage = `Unable to import container. ${error}`;
          } else {
            this.successMessage = response.data.value;
          }
        })
        .catch((e: any) => {
          this.errorMessage = e;
        })
        .finally(() => this.loading = false)
  }

}
</script>
