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
        <v-toolbar-title>{{$t('home.dataImportsDescription')}}</v-toolbar-title>
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
        <v-toolbar-title>{{$t('home.timeseriesImportsDescription')}}</v-toolbar-title>
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
            <h3 class="text-h3">{{$t('dataImports.tableTitle')}}</h3>
            <v-spacer></v-spacer>
            <div v-if="selectedDataSource.adapter_type === 'standard' || selectedDataSource.adapter_type === 'manual' || selectedDataSource.adapter_type === 'timeseries'">
              <import-data-dialog
                :dataSourceID="selectedDataSource.id"
                :containerID="containerID"
                :disabled="!selectedDataSource.active || selectedDataSource.archived"
                @importUploaded="listImports">
              </import-data-dialog>
            </div>
          </v-col>
        </template>

        <template v-slot:item.percentage_processed="{ item }">
          {{ item.total_records == 0 ? $t('dataImports.noData') : (Math.round((item.records_inserted / item.total_records) * 100) * 100 / 100).toFixed(2) + "%" }}
        </template>

        <template v-slot:item.status="{ item }">
          <div v-if="item.records_inserted === item.total_records">{{$t('dataImports.completed')}}</div>
          <div v-else>{{item.status}}</div>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-icon small class="mr-2" @click="viewItem(item)" v-if="activeTab === 'datasources'">
            mdi-eye
          </v-icon>
          <timeseries-source-dialog v-if="activeTab === 'timeseries'"
            :containerID="containerID"
            :dataSourceID="selectedDataSource.id"
            :icon="true"
          />
          <delete-data-import-dialog v-if="activeTab === 'datasources'"
            :containerID="containerID"
            :dataImport="item" :icon="true"
            @dataImportDeleted="listImports"
          ></delete-data-import-dialog>
          <reprocess-data-import-dialog v-if="activeTab === 'dataSources'"
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
        <v-toolbar dark color="warning" flat tile>
          <v-btn icon dark @click="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>{{$t("dataImports.dataView")}}</v-toolbar-title>
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
              <span>{{$t('dataImports.copyID')}}-</span>
              <span>{{item.id}}</span>
            </v-tooltip>
          </template>

          <template v-slot:item.mapping="{ item }">
            <v-btn @click="toTypeMapping(item.shape_hash)">{{$t('dataImports.toTypeMapping')}}</v-btn>
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
          <span class="headline text-h3">{{$t('dataImports.viewData')}}</span>
        </v-card-title>

        <json-viewer
          class="pt-4 px-4 flex-grow-1"
          :value="selectedData"
          :maxDepth=4
          style="overflow-x: auto"
        />

        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="dataDialog = false" >{{$t("dataImports.done")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="mappingDialog" width="90%" scrollable>
      <v-card class="d-flex flex-column">
        <v-card-title class="grey lighten-2 flex-shrink-1">
          <span class="headline text-h3">{{$t('dataImports.editTypeMapping')}}</span>
          <v-flex class="text-right">
            <v-icon class="justify-right"  @click="mappingDialog = false">mdi-window-close</v-icon>
          </v-flex>
        </v-card-title>

        <div class="flex-grow-1" v-if="selectedDataSource !== null && mappingDialog">
          <data-type-mapping :dataSourceID="selectedDataSource.id" :containerID="containerID" :shapeHash="selectedDataShapeHash" @mappingCreated="mappingDialog = false"></data-type-mapping>
        </div>
        <v-card-actions class="flex-shrink-1">
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="mappingDialog = false" >{{$t("dataMapping.done")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {DataSourceT , ImportDataT, ImportT} from "@/api/types";
import ImportDataDialog from "@/components/dataImport/importDataDialog.vue";
import DataTypeMapping from "@/components/etl/dataTypeMapping.vue"
import SelectDataSource from "@/components/dataSources/selectDataSource.vue";
import DeleteDataImportDialog from "@/components/dataImport/deleteDataImportDialog.vue";
import ReprocessDataImportDialog from "@/components/dataImport/reprocessDataImportDialog.vue";
import {mdiFileDocumentMultiple} from "@mdi/js";
import TimeseriesSourceDialog from '@/components/data/timeseriesSourceDialog.vue';


@Component({filters: {
    pretty: function(value: any) {
      return JSON.stringify(JSON.parse(value), null, 2);
    }
  },
  components: {
    ImportDataDialog,
    DataTypeMapping,
    SelectDataSource,
    DeleteDataImportDialog,
    ReprocessDataImportDialog,
    TimeseriesSourceDialog
  }
})
export default class DataImports extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  @Prop({required: false, default: ""})
  readonly argument!: string;


  copy = mdiFileDocumentMultiple
  errorMessage = ""
  dataErrorMessage = ""
  dialog = false
  dataDialog = false
  mappingDialog = false
  selectedData: {[key: string]: any} | null = null
  selectedDataSource: DataSourceT | null = null
  selectedImport: ImportT | null = null
  dataSources: DataSourceT[] = []
  imports: ImportT[] = []
  importData: ImportDataT[] = []
  importDataMapping: ImportDataT | null = null
  successMessage = ""
  dataSuccessMessage = ""
  listOptions: {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 100}
  options: {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 100}

  importCount = 0
  importsLoading = false
  importDataCount = 0
  importLoading = false
  selectedDataShapeHash = ''
  activeTab = 'datasources'
  timeseriesDataSources: DataSourceT[] = []
  timeseriesLoading = false

  $refs!: {
    selectDataSource: SelectDataSource
  }

  headers() {
    const headers = [
      {
        text: this.$t('dataImports.createdAt'),
        value: "created_at",
      },
      {
        text: this.$t('dataImports.status'),
        value: "status",
      },
      {
        text: this.$t('dataImports.totalErrors'),
        value: "total_errors",
        sortable: false
      },
      {
        text: this.$t('dataImports.message'),
        value: "status_message",
        sortable: false
      },
      { text: this.$t('dataImports.viewEditData'),
        value: 'actions',
        sortable: false
      }
    ]

    if (this.activeTab === 'datasources') {
      headers.splice(1, 0, {
        text: this.$t('dataImports.percentageProcessed'),
        value: "percentage_processed"
      })
    }

    return headers;
  }

  switchTabs(tab: string) {
    this.activeTab = tab
    this.resetDropdown(tab)
    this.selectedDataSource = null
    this.$forceUpdate()
  }

  importDataHeaders() {
    return  [{
      text: this.$t('dataImports.id'),
      value: "id",
    },
      {
        text: this.$t('dataImports.createdAt'),
        value: "created_at",
      },
      {
        text: this.$t('dataImports.processedAt'),
        value: "inserted_at",
      },
      {
        text: this.$t('dataImports.errors'),
        value: "errors"
      },
      {  text: this.$t('dataImports.mapping'), value: 'mapping', sortable: false },
      {  text: this.$t('dataImports.viewDeleteData'), value: 'actions', sortable: false },]
  }

  timeseriesHeaders() {
    return [
      { text: '', value: 'copy'},
      { text: this.$t('dataSources.id'), value: 'id'},
      { text: this.$t('dataSources.name'), value: 'name'},
      { text: 'Index Type', value: 'type'},
      { text: this.$t('dataSources.active'), value: 'active'},
      { text: 'Actions', value: 'actions'},
    ]
  }

  @Watch('options')
  onOptionChange() {
    this.loadImportData()
  }

  @Watch('listOptions')
  onListOptionsChange() {
    this.listImports()
  }

  setDataSource(dataSource: any) {
    this.selectedDataSource = dataSource
    this.$router.replace(`/containers/${this.containerID}/data-imports/${this.selectedDataSource?.id}`)
    this.listImports()

    this.$client.countImports(this.containerID, dataSource.id)
        .then(importCount => {
          this.importCount = importCount
        })
        .catch(e => this.errorMessage = e)
  }

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
  }

  mounted() {
    this.$client.listDataSources(this.containerID)
        .then(dataSources => {
          this.dataSources = dataSources
        })
        .catch(e => this.errorMessage = e);

    this.refreshTimeseriesDataSources();
  }

  refreshTimeseriesDataSources() {
    this.timeseriesLoading = true
    this.$client.listDataSources(this.containerID, true, true)
        .then(dataSources => {
          this.timeseriesDataSources= dataSources
        })
        .catch(e => this.errorMessage = e)
        .finally(() => this.timeseriesLoading = false)
  }

  downloadTimeseriesData(sourceID: string) {
    this.$client.downloadTimeseriesData(this.containerID, sourceID)
      .catch(e => this.errorMessage = e)
  }

  deleteItem(importT: ImportT) {
    this.$client.deleteImport(this.containerID, importT.id)
        .then(()=> {
          this.listImports()
          this.successMessage = this.$t('dataImports.successfullyDeleted') as string
        })
        .catch((e: any) => this.errorMessage = e)
  }

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
  }

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

  }

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
  }

  viewImportData(importData: ImportDataT) {
    this.selectedData = importData.data
    this.dataDialog = true
  }

  editTypeMapping(importData: ImportDataT) {
    this.importDataMapping = importData
    this.mappingDialog = true
  }

  deleteImportData(importData: ImportDataT) {
    if(importData.inserted_at) {
      this.dataErrorMessage= "Unable to delete data that has already been inserted"
      return
    }

    this.$client.deleteImportData(this.containerID, importData.import_id, importData.id)
        .then(() => {
          this.loadImportData()
        })
        .catch((e: any) => this.dataErrorMessage= e)
  }

  toTypeMapping(shapeHash: string) {
    this.selectedDataShapeHash = shapeHash
    this.mappingDialog = true
  }

  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }

  resetDropdown(tab: string) {
    this.$refs.selectDataSource!.reset(tab)
  }
}
</script>
