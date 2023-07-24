<template>
  <v-card>
    <v-tabs grow>
      <v-tab @click="switchTabs('datasources')">
        {{ $t('dataSources.dataSources') }}
      </v-tab>
      <v-tab @click="switchTabs('timeseries'); refreshTimeseriesDataSources()">
        {{ $t('dataSources.timeseries') }}
      </v-tab>
    </v-tabs>
    <error-banner :message="errorMessage"></error-banner>
    <success-banner :message="successMessage"></success-banner>
    <div class="mx-2" v-if="activeTab === 'datasources'">
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('imports.description')}}</v-toolbar-title>
      </v-toolbar>
      <select-data-source
        :containerID="containerID"
        :showArchived="true"
        :dataSourceID="argument"
        @selected="setDataSource"
        ref="selectDataSource"
      />
    </div>

    <div class="mx-2" v-if="activeTab === 'timeseries'">
      <v-toolbar flat color="white">
        <v-toolbar-title>{{$t('imports.timeseriesDescription')}}</v-toolbar-title>
      </v-toolbar>
      <select-data-source
        :containerID="containerID"
        :showArchived="true"
        :timeseries="true"
        @selected="setDataSource"
        ref="selectDataSource"
      />
    </div>

    <v-divider v-if="(selectedDataSource !== null)"></v-divider>

    <div v-if="(selectedDataSource !== null)">
      <v-data-table
        :headers="headers()"
        :items="imports"
        :server-items-length="importCount"
        :options.sync="listOptions"
        :loading="importsLoading"
        :items-per-page="100"
        :footer-props="{'items-per-page-options': [25, 50, 100]}"
      >
        <template v-slot:top>
          <v-col class="d-flex flex-row">
            <h3 class="text-h3">{{$t('imports.imports')}}</h3>
            <v-spacer></v-spacer>
            <div v-if="selectedDataSource.adapter_type === 'standard' || selectedDataSource.adapter_type === 'manual' || selectedDataSource.adapter_type === 'timeseries'">
              <import-data-dialog
                :dataSourceID="selectedDataSource.id"
                :containerID="containerID"
                :fastload="isCustomDataSourceConfig(selectedDataSource.config) ? selectedDataSource.config.fast_load_enabled : false"
                :disabled="!selectedDataSource.active || selectedDataSource.archived"
                @importUploaded="listImports"
              />
            </div>
          </v-col>
        </template>

        <template v-slot:item.percentage_processed="{ item }">
          {{ item.total_records == 0 ? $t('general.noData') : (Math.round((item.records_inserted / item.total_records) * 100) * 100 / 100).toFixed(2) + "%" }}
        </template>

        <template v-slot:item.status="{ item }">
          <div v-if="item.records_inserted === item.total_records">{{$t('general.completed')}}</div>
          <div v-else>{{item.status}}</div>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-icon small class="mr-2" @click="viewItem(item)" v-if="activeTab === 'datasources'">
            mdi-eye
          </v-icon>
          <timeseries-viewer-dialog v-if="activeTab === 'timeseries'"
            :containerID="containerID"
            :dataSourceID="selectedDataSource.id"
            :icon="true"
          />
          <delete-data-import-dialog v-if="activeTab === 'datasources'"
            :containerID="containerID"
            :dataImport="item" :icon="true"
            @dataImportDeleted="listImports"
          ></delete-data-import-dialog>
          <reprocess-data-import-dialog v-if="activeTab === 'datasources'"
            :containerID="containerID"
            :dataImport="item"
            :icon="true"
            @dataImportReprocessed="listImports"
          ></reprocess-data-import-dialog>
        </template>
      </v-data-table>
    </div>

    <v-dialog
      v-model="dialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar dark color="secondary" flat tile>
          <v-btn icon dark @click="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>{{$t("imports.data")}}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-divider></v-divider>
        <error-banner :message="dataErrorMessage"></error-banner>
        <success-banner :message="dataSuccessMessage"></success-banner>
        <v-data-table
          :headers="importDataHeaders()"
          :items="importData"
          class="elevation-1"
          :server-items-length="importDataCount"
          :options.sync="options"
          :loading="importLoading"
          :items-per-page="100"
          :footer-props="{'items-per-page-options':[25,50,100]}"
        >
          <template v-slot:top></template>

          <template v-slot:[`item.id`]="{ item }">
            <v-tooltip top>
              <template v-slot:activator="{on, attrs}">
                <v-icon v-bind="attrs" v-on="on" @click="copyID(item.id)">{{copy}}</v-icon>
              </template>
              <span>{{$t('general.copyID')}}-</span>
              <span>{{item.id}}</span>
            </v-tooltip>
          </template>

          <template v-slot:item.mapping="{ item }">
            <v-btn @click="toTypeMapping(item.shape_hash)">{{$t('typeMappings.mapping')}}</v-btn>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-icon small class="mr-2" @click="viewImportData(item)">
              mdi-eye
            </v-icon>
            <v-icon small @click="deleteImportData(item)">
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dataDialog" width="60%" scrollable>
      <v-card class="d-flex flex-column">
        <v-card-title class="grey lighten-2 flex-shrink-1">
          <span class="headline text-h3">{{$t('general.rawData')}}</span>
        </v-card-title>

        <json-viewer
          class="pt-4 px-4 flex-grow-1"
          :value="selectedData"
          :maxDepth=4
          style="overflow-x: auto"
        />

        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="dataDialog = false" >{{$t("general.done")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="mappingDialog" width="90%" scrollable>
      <v-card class="d-flex flex-column">
        <v-card-title class="grey lighten-2 flex-shrink-1">
          <span class="headline text-h3">{{$t('typeMappings.typeMapping')}}</span>
          <v-flex class="text-right">
            <v-icon class="justify-right"  @click="mappingDialog = false">mdi-window-close</v-icon>
          </v-flex>
        </v-card-title>

        <div class="flex-grow-1" v-if="selectedDataSource !== null && mappingDialog">
          <data-type-mapping :dataSourceID="selectedDataSource.id" :containerID="containerID" :shapeHash="selectedDataShapeHash" @mappingCreated="mappingDialog = false"></data-type-mapping>
        </div>
        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="mappingDialog = false" >{{$t("general.done")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { VueConstructor } from 'vue';
  import {DataSourceT , ImportDataT, ImportT} from "@/api/types";
  import ImportDataDialog from "@/components/dataImport/importDataDialog.vue";
  import DataTypeMapping from "@/components/etl/dataTypeMapping.vue"
  import SelectDataSource from "@/components/dataSources/selectDataSource.vue";
  import DeleteDataImportDialog from "@/components/dataImport/deleteDataImportDialog.vue";
  import ReprocessDataImportDialog from "@/components/dataImport/reprocessDataImportDialog.vue";
  import {mdiFileDocumentMultiple} from "@mdi/js";
  import TimeseriesViewerDialog from '@/components/data/timeseriesViewerDialog.vue';

  interface CustomDataSourceConfig {
    fast_load_enabled: boolean;
  }

  interface Options {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  }

  interface DataImportsModel {
    copy: typeof mdiFileDocumentMultiple,
    errorMessage: string,
    dataErrorMessage: string,
    dialog: boolean,
    dataDialog: boolean,
    mappingDialog: boolean,
    successMessage: string,
    dataSuccessMessage: string,
    importCount: number,
    importsLoading: boolean,
    importDataCount: number,
    importLoading: boolean,
    selectedDataShapeHash: string,
    activeTab: string,
    timeseriesLoading: boolean,
    selectedData: {[key: string]: any} | null
    selectedDataSource: DataSourceT | null
    selectedImport: ImportT | null
    dataSources: DataSourceT[]
    imports: ImportT[]
    importData: ImportDataT[]
    importDataMapping: ImportDataT | null
    timeseriesDataSources: DataSourceT[]
    options: Options
    listOptions: Options
  }

  export default Vue.extend ({
    name: 'ViewDataImports',

    components: { ImportDataDialog, DataTypeMapping, SelectDataSource, DeleteDataImportDialog, ReprocessDataImportDialog, TimeseriesViewerDialog },

    props: {
      containerID: {type: String, required: true},
      argument: {type: String, required: false, default: ""},
    },

    data(): DataImportsModel {
      const options: Options = {
        sortDesc: [false],
        sortBy: [],
        page: 1,
        itemsPerPage: 100,
      }

      const listOptions: Options = {
        sortDesc: [false],
        sortBy: [],
        page: 1,
        itemsPerPage: 100,
      }

      return {
      copy: mdiFileDocumentMultiple,
      errorMessage: "",
      dataErrorMessage: "",
      dialog: false,
      dataDialog: false,
      mappingDialog: false,
      successMessage: "",
      dataSuccessMessage: "",
      importCount: 0,
      importsLoading: false,
      importDataCount: 0,
      importLoading: false,
      selectedDataShapeHash: '',
      activeTab: 'datasources',
      timeseriesLoading: false,
      selectedData: null,
      selectedDataSource: null,
      selectedImport: null,
      dataSources: [],
      imports: [],
      importData: [],
      importDataMapping: null,
      timeseriesDataSources: [],
      options,
      listOptions
    }},

    watch: {
      options: 'onOptionChange',
      listOptions: 'onListOptionsChange'
    },

    methods: {
      headers() {
        const headers = [
          {
            text: this.$t('general.dateCreated'),
            value: "created_at",
          },
          {
            text: this.$t('general.status'),
            value: "status",
          },
          {
            text: this.$t('imports.totalErrors'),
            value: "total_errors",
            sortable: false
          },
          {
            text: this.$t('general.statusMessage'),
            value: "status_message",
            sortable: false
          },
          { text: this.$t('general.viewEdit'),
            value: 'actions',
            sortable: false
          }
        ]

        if (this.activeTab === 'datasources') {
          headers.splice(1, 0, {
            text: this.$t('imports.percentageProcessed'),
            value: "percentage_processed"
          })
        }

        return headers;
      },
      isCustomDataSourceConfig(config: any): config is CustomDataSourceConfig {
        return config && config.fast_load_enabled !== undefined;
      },
      switchTabs(tab: string) {
        this.activeTab = tab
        this.resetDropdown(tab)
        this.selectedDataSource = null
        this.$forceUpdate()
      },
      importDataHeaders() {
        return  [{
          text: this.$t('general.id'),
          value: "id",
        },
          {
            text: this.$t('general.dateCreated'),
            value: "created_at",
          },
          {
            text: this.$t('general.processedAt'),
            value: "inserted_at",
          },
          {
            text: this.$t('errors.errors'),
            value: "errors"
          },
          {  text: this.$t('typeMappings.typeMapping'), value: 'mapping', sortable: false },
          {  text: this.$t('general.viewDelete'), value: 'actions', sortable: false },]
      },
      timeseriesHeaders() {
        return [
          { text: '', value: 'copy'},
          { text: this.$t('general.id'), value: 'id'},
          { text: this.$t('general.name'), value: 'name'},
          { text: this.$t('timeseries.indexType'), value: 'type'},
          { text: this.$t('general.active'), value: 'active'},
          { text: this.$t('general.actions'), value: 'actions'},
        ]
      },
      onOptionChange() {
        this.loadImportData()
      },
      onListOptionsChange() {
        this.listImports()
      },
      setDataSource(dataSource: any) {
        this.selectedDataSource = dataSource
        this.$router.replace(`/containers/${this.containerID}/data-imports/${this.selectedDataSource?.id}`)
        this.listImports()

        this.$client.countImports(this.containerID, dataSource.id)
            .then(importCount => {
              this.importCount = importCount
            })
            .catch(e => this.errorMessage = e)
      },
      listImports() {
        if(this.selectedDataSource) {
          this.importsLoading = true
          this.imports = []

          const {page, itemsPerPage, sortBy, sortDesc } = this.listOptions;
          let sortParam: string | undefined
          let sortDescParam: boolean | undefined

          const pageNumber = page - 1;
          if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
          if(sortBy && sortBy.length >= 1 && sortBy[0] === 'percentage_processed') sortParam = 'records_inserted'
          if(sortDesc) sortDescParam = sortDesc[0]

          this.$client.listImports(this.containerID, this.selectedDataSource.id!,{
            limit: itemsPerPage,
            offset: itemsPerPage * pageNumber,
            sortBy: sortParam,
            sortDesc: sortDescParam
          })
              .then(imports => {
                this.importCount = imports.length
                this.importsLoading = false
                this.imports = imports
              })
              .catch(e => this.errorMessage = e)
        }
      },
      refreshTimeseriesDataSources() {
        this.timeseriesLoading = true
        this.$client.listDataSources(this.containerID, true, true)
            .then(dataSources => {
              this.timeseriesDataSources= dataSources
            })
            .catch(e => this.errorMessage = e)
            .finally(() => this.timeseriesLoading = false)
      },
      downloadTimeseriesData(sourceID: string) {
        this.$client.downloadTimeseriesData(this.containerID, sourceID)
          .catch(e => this.errorMessage = e)
      },
      deleteItem(importT: ImportT) {
        this.$client.deleteImport(this.containerID, importT.id)
            .then(()=> {
              this.listImports()
              this.successMessage = this.$t('imports.successfullyDeleted') as string
            })
            .catch((e: any) => this.errorMessage = e)
      },
      viewItem(importT: ImportT) {
        if (this.activeTab === 'datasources') {
          this.selectedImport = importT
          this.loadImportData()

          this.$client.countImportData(this.containerID, importT.id)
              .then((count) => {
                this.importDataCount = count
                this.dialog = true
              })
              .catch((e: any) => this.errorMessage = e)
        }
      },
      loadImportData() {
        this.importLoading = true
        this.importData = []

        const {page, itemsPerPage, sortBy, sortDesc } = this.options;
        let sortParam: string | undefined
        let sortDescParam: boolean | undefined

        const pageNumber = page - 1;
        if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
        if(sortDesc) sortDescParam = sortDesc[0]

        this.$client.listImportData(this.containerID, this.selectedImport!.id,{
          limit: itemsPerPage,
          offset: itemsPerPage * pageNumber,
          sortBy: sortParam,
          sortDesc: sortDescParam
        })
            .then((results) => {
              this.importData = results
              this.importLoading = false

            })
            .catch((e: any) => this.errorMessage = e)

      },
      dataUnexpired(importT: ImportT) {
        if (this.selectedDataSource!.config?.kind == 'standard' || this.selectedDataSource!.config?.kind == 'manual') {
          const retentionDays = this.selectedDataSource!.config!.data_retention_days!
          if (retentionDays != -1) {
            const expirationDate = new Date(importT.created_at)
            expirationDate.setDate(expirationDate.getDate() + retentionDays)
            return new Date() < expirationDate
          } else {
            return true
          }
        }
      },
      viewImportData(importData: ImportDataT) {
        this.selectedData = importData.data
        this.dataDialog = true
      },
      editTypeMapping(importData: ImportDataT) {
        this.importDataMapping = importData
        this.mappingDialog = true
      },
      deleteImportData(importData: ImportDataT) {
        if(importData.inserted_at) {
          this.dataErrorMessage= this.$t('imports.deleteError') as string
          return
        }

        this.$client.deleteImportData(this.containerID, importData.import_id, importData.id)
            .then(() => {
              this.loadImportData()
            })
            .catch((e: any) => this.dataErrorMessage= e)
      },
      toTypeMapping(shapeHash: string) {
        this.selectedDataShapeHash = shapeHash
        this.mappingDialog = true
      },
      copyID(id: string) {
        navigator.clipboard.writeText(id)
      },
      resetDropdown(tab: string) {
      const selectDataSourceRef = this.$refs.selectDataSource as InstanceType<
        VueConstructor<InstanceType<typeof SelectDataSource>>
      >;

      if (selectDataSourceRef) {
        selectDataSourceRef.reset(tab);
      }
    },
    },

    mounted() {
      this.$client.listDataSources(this.containerID)
          .then(dataSources => {
            this.dataSources = dataSources
          })
          .catch(e => this.errorMessage = e);

      this.refreshTimeseriesDataSources();
    }
  });
</script>
