<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" v-if="mappings && mappings.length > 0" dark class="mb-2" v-on="on">{{$t("exportMapping.export")}} {{mappings.length}} Mapping(s)</v-btn>
      <v-btn color="primary" v-else dark class="mb-2" v-on="on">{{$t("exportMapping.exportAll")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('exportMapping.title')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-select
              :items="containers"
              item-text="name"
              :label="$t('exportMapping.selectContainer')"
              return-object
              @input="setContainer"
            ></v-select>

            <v-select
              :items="dataSources"
              item-text="name"
              :label="$t('exportMapping.selectDataSource')"
              return-object
              @input="setDataSource"
              :disabled="!container"
            ></v-select>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false; reset()" >{{$t("exportMapping.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="exportToFile()">{{$t("exportMapping.exportToFile")}}</v-btn>
        <v-btn color="blue darken-1" :disabled="!dataSource" text @click="exportToDataSource()">{{$t("exportMapping.exportToDataSource")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {ContainerT, DataSourceT, TypeMappingT} from "../../api/types";
import {RetrieveJWT} from "@/auth/authentication_service";
import buildURL from "build-url";
import {AxiosBasicCredentials, AxiosRequestConfig, AxiosResponse} from "axios";
import Config from "@/config";
const axios = require('axios').default;

@Component
export default class ExportMappingsDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  dataSourceID!: string;

  @Prop({required: false, default: []})
  mappings?: TypeMappingT[]

  @Prop({required: false})
  containerName?: string;

  @Prop({required: false})
  dataSourceName?: string;

  errorMessage = ""
  dialog = false
  containers: ContainerT[] = []
  dataSources: DataSourceT[] = []
  container: ContainerT | null = null
  dataSource: DataSourceT | null = null

  mounted() {
    this.$client.listContainers()
        .then(containers => {
          this.containers = containers
        })
        .catch(e => this.errorMessage = e)
  }

  @Watch('container', {immediate: true})
  onContainerSelect() {
    if(this.container) {
      this.$client.listDataSources(this.container.id)
          .then(dataSources => {
            this.dataSources = dataSources
          })
          .catch((e: any) => this.errorMessage = e)
    }
  }

  setContainer(container: ContainerT) {
    this.container = container
  }

  setDataSource(dataSource: DataSourceT) {
    this.dataSource = dataSource
  }

  reset() {
    this.container = null
    this.dataSource = null
    this.containers = []
    this.dataSources = []
  }

  exportToFile() {
    // I'm not a fan of doing this, but we have to call axios directly here instead of using the api abstraction
    // the reason being is that we have to basically do some DOM actions under the hood in order to start a file
    // download
    const config: AxiosRequestConfig = {}
    config.responseType = "blob"
    config.headers = {"Access-Control-Allow-Origin": "*"}

    if(Config?.deepLynxApiAuth === "token") {
      config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
    }

    if(Config?.deepLynxApiAuth === "basic") {
      config.auth = {username: Config.deepLynxApiAuthBasicUser, password: Config.deepLynxApiAuthBasicPass} as AxiosBasicCredentials
    }

    const url = buildURL(Config?.deepLynxApiUri!, {path: `/containers/${this.containerID}/import/datasources/${this.dataSourceID}/mappings/export`})

    axios.post(url, {
      mapping_ids: (this.mappings) ? this.mappings.map(mapping => mapping.id) : []
    }, config)
    .then((response: AxiosResponse) => {
      if(response.status > 299 || response.status < 200) {
        this.errorMessage = `Unable to download exported type mappings`
      } else {
        const fetchedURL = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')

        link.href = fetchedURL
        link.setAttribute('download', `${this.containerName} ${this.dataSourceName} Type Mappings.json`)
        document.body.append(link)
        link.click()
        this.dialog = false
      }
    })
    .catch((e: any) => this.errorMessage = e)
  }

  exportToDataSource() {
    if(this.dataSource) {
      this.$client.exportTypeMappings(this.containerID, this.dataSourceID, this.dataSource.id!, ...this.mappings!)
      .then(results => {
        this.dialog = false
        this.$emit('mappingsExported', results)
      })
      .catch((e: any) => this.errorMessage = e)
    }
  }

}
</script>