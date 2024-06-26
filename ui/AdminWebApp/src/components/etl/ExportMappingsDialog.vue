<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false; reset()" max-width="60%">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" v-if="mappings && mappings.length > 0" dark class="mb-2" v-on="on">{{$t("exports.export")}} {{mappings.length}} {{$t('typeMappings.mappingsMaybePlural')}}</v-btn>
      <v-btn color="primary" v-else dark class="mb-2" v-on="on">{{$t("typeMappings.exportAll")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('typeMappings.export')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-select
              :items="containers"
              item-text="name"
              :label="$t('containers.select')"
              return-object
              @input="setContainer"
            ></v-select>

            <v-select
              :items="dataSources"
              item-text="name"
              :label="$t('dataSources.select')"
              return-object
              @input="setDataSource"
              :disabled="!container"
            ></v-select>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false; reset()" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="exportToFile()">{{$t("exports.toFile")}}</v-btn>
        <v-btn color="primary" :disabled="!dataSource" text @click="exportToDataSource()">{{$t("exports.toDataSource")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {ContainerT, DataSourceT, TypeMappingT} from "../../api/types";
  import {RetrieveJWT} from "@/auth/authentication_service";
  import buildURL from "build-url";
  import {AxiosBasicCredentials, AxiosRequestConfig, AxiosResponse} from "axios";
  import Config from "@/config";
  const axios = require('axios').default;

  interface ExportMappingsDialogModel {
    errorMessage: string;
    dialog: boolean;
    containers: ContainerT[];
    dataSources: DataSourceT[];
    container: ContainerT | null;
    dataSource: DataSourceT | null;
  }

  export default Vue.extend ({
    name: 'ExportMappingsDialog',

    props: {
      containerID: {type: String, required: true},
      dataSourceID: {type: String, required: true},
      mappings: {
        type: Array as PropType<TypeMappingT[]>, 
        required: false, 
        default: () => [] 
      },
      containerName: {type: String, required: false},
      dataSourceName: {type: String, required: false},
    },

    data: (): ExportMappingsDialogModel => ({
      errorMessage: "",
      dialog: false,
      containers: [],
      dataSources: [],
      container: null,
      dataSource: null,
    }),

    watch: {
      container: {handler: 'onContainerSelect', immediate: true},
    },

    methods: {
      onContainerSelect() {
        if(this.container) {
          this.$client.listDataSources(this.container.id)
            .then(dataSources => {
              this.dataSources = dataSources
            })
            .catch((e: any) => this.errorMessage = e)
        }
      },
      setContainer(container: ContainerT) {
        this.container = container
      },
      setDataSource(dataSource: DataSourceT) {
        this.dataSource = dataSource
      },
      reset() {
        this.container = null
        this.dataSource = null
        this.containers = []
        this.dataSources = []
      },
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
            this.errorMessage = this.$t('errors.downloadMappings') as string
          } else {
            const fetchedURL = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')

            link.href = fetchedURL
            link.setAttribute('download', `${this.containerName} ${this.dataSourceName} ${this.$t('typeMappings.typeMappings')}.json`)
            document.body.append(link)
            link.click()
            this.dialog = false
          }
        })
        .catch((e: any) => this.errorMessage = e)
      },
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
    },

    mounted() {
      this.$client.listContainers()
        .then(containers => {
          this.containers = containers
        })
        .catch(e => this.errorMessage = e)
    }
  });
</script>
