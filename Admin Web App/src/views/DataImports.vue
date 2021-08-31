<template>
  <v-card
  >
    <error-banner :message="errorMessage"></error-banner>
    <success-banner :message="successMessage"></success-banner>
    <select-data-source
        :containerID="containerID"
        :showArchived="true"
        @selected="setDataSource">
    </select-data-source>

    <v-card v-if="(selectedDataSource !== null)">

      <v-data-table
          :headers="headers()"
          :items="imports"
          :server-items-length="importCount"
          :options.sync="listOptions"
          :loading="importsLoading"
          :items-per-page="100"
          :footer-props="{
                  'items-per-page-options': [25, 50, 100]
                }"
          class="elevation-1"
      >
        <template v-slot:top>
          <v-col v-if="selectedDataSource.adapter_type === 'standard' || selectedDataSource.adapter_type === 'manual'">
            <import-data-dialog
                :dataSourceID="selectedDataSource.id"
                :containerID="containerID"
                :disabled="!selectedDataSource.active || selectedDataSource.archived"
                @importUploaded="listImports()">
            </import-data-dialog>
          </v-col>

          <v-col>
            <h2>{{$t('dataImports.tableTitle')}}</h2>
          </v-col>
        </template>
        <template v-slot:item.percentage_processed="{ item }">
          {{ (item.records_inserted / item.total_records) * 100 }}%
        </template>
        <template v-slot:item.actions="{ item }">
          <v-icon
              small
              class="mr-2"
              @click="viewItem(item)"
          >
            mdi-eye
          </v-icon>
          <v-icon
              small
              @click="deleteItem(item)"
          >
            mdi-delete
          </v-icon>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog
        v-model="dialog"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
    >

      <v-card>
        <v-toolbar
            dark
            color="warning"
        >
          <v-btn
              icon
              dark
              @click="dialog = false"
          >
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
            :footer-props="{
                'items-per-page-options':[25,50,100]
              }"
        >
          <template v-slot:top>
          </template>
          <template v-slot:item.typeMappings="{ item }">
            <!-- TODO: Create a type mapping connection component here - give the user the option to create a type mapping using this data -->
            <v-btn @click="editTypeMapping(item)" color="warning">{{$t('dataImports.editTypeMapping')}}</v-btn>
          </template>
          <template v-slot:item.actions="{ item }">
            <v-icon
                small
                class="mr-2"
                @click="viewImportData(item)"
            >
              mdi-eye
            </v-icon>
            <v-icon
                small
                @click="deleteImportData(item)"
            >
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="dataDialog"
        width="500"
    >
      <v-card style="overflow-y: scroll">
        <v-card-title class="headline grey lighten-2">
          {{$t('dataImports.viewData')}}
        </v-card-title>
        <json-view
            :data="selectedData"
            :maxDepth=4
        />

        <v-card-actions>
          <v-spacer></v-spacer>
          <!-- TODO: Fill with actions like edit and delete -->
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
        v-model="mappingDialog"
    >
      <v-card>
        <v-card-title class="headline grey lighten-2">
          {{$t('dataImports.editTypeMapping')}}
        </v-card-title>
        <div v-if="selectedDataSource !== null && mappingDialog">
          <data-type-mapping :dataSourceID="selectedDataSource.id" :containerID="containerID" :import="importDataMapping" :typeMappingID="importDataMapping.mapping_id" @mappingCreated="mappingDialog = false"></data-type-mapping>
        </div>
      </v-card>
    </v-dialog>
  </v-card>

</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from 'vue-property-decorator'
import {DataSourceT, ImportDataT, ImportT} from "@/api/types";
import ImportDataDialog from "@/components/importDataDialog.vue";
import DataTypeMapping from "@/components/dataTypeMapping.vue"
import SelectDataSource from "@/components/selectDataSource.vue";


@Component({filters: {
    pretty: function(value: any) {
      return JSON.stringify(JSON.parse(value), null, 2);
    }
  },
  components: {
    ImportDataDialog,
    DataTypeMapping,
    SelectDataSource
  }
})
export default class DataImports extends Vue {
  @Prop({required: true})
  readonly containerID!: string;


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

  headers() {
    return  [{
      text: this.$t('dataImports.createdAt'),
      value: "created_at",
    },
      {
        text: this.$t('dataImports.percentageProcessed'),
        value: "percentage_processed"
      },
      {
        text: this.$t('dataImports.status'),
        value: "status",
      },
      {
        text: this.$t('dataImports.message'),
        value: "status_message",
        sortable: false
      },
      { text: this.$t('dataImports.viewEditData'),  value: 'actions', sortable: false }]
  }

  importDataHeaders() {
    return  [{
      text: this.$t('dataImports.id'),
      value: "id",
    },
      {
        text: this.$t('dataImports.processedAt'),
        value: "inserted_at",
      },
      {
        text: this.$t('dataImports.errors'),
        value: "errors"
      }, {
        text: this.$t('dataImports.typeMapping'),
        value: 'typeMappings'
      },
      {  text: this.$t('dataImports.viewDeleteData'), value: 'actions', sortable: false },]
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
            this.importsLoading = false
            this.imports = imports
            this.$forceUpdate()
          })
          .catch(e => this.errorMessage = e)
    }
  }

  mounted() {
    this.$client.listDataSources(this.containerID)
        .then(dataSources => {
          this.dataSources = dataSources
        })
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
    this.selectedImport = importT
    this.loadImportData()

    this.$client.countImportData(this.containerID, importT.id)
        .then((count) => {
          this.importDataCount = count
          this.dialog = true
        })
        .catch((e: any) => this.errorMessage = e)
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
}
</script>
