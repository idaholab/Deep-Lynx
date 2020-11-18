<template>
    <v-card
    >
      <error-banner :message="errorMessage"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <v-select
                style="margin-left:10px; margin-right: 10px"
                :items="dataSources"
                item-text="name"
                return-object
                @change="setDataSource"
                :value="selectedDataSource"
                label="Select Data Source"
        ></v-select>

        <v-card v-if="(selectedDataSource !== null)">

        <v-data-table
                :headers="headers"
                :items="imports"
                class="elevation-1"
        >
            <template v-slot:top>
                <v-col v-if="selectedDataSource.adapter_type === 'manual'">
                    <import-data-dialog
                            :dataSourceID="selectedDataSource.id"
                            :containerID="containerID"
                            @importUploaded="listImports">
                    </import-data-dialog>
                </v-col>

              <v-col>
                <h2>{{$t('dataImports.tableTitle')}}</h2>
              </v-col>
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
              color="primary"
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
              :headers="importDataHeaders"
              :items="importData"
              class="elevation-1"
          >
            <template v-slot:top>
            </template>
            <template v-slot:item.typeMappings="{ item }">
              <!-- TODO: Create a type mapping connection component here - give the user the option to create a type mapping using this data -->
              <div v-if="item.mapping_id">
                has mapping
              </div>
              <div v-else>
                <v-btn @click="createTypeMapping(item)">{{$t('dataImports.createTypeMapping')}}</v-btn>
              </div>
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
        <v-card>
          <v-card-title class="headline grey lighten-2">
            {{$t('dataImports.viewData')}}
          </v-card-title>
          <v-textarea
              filled
              name="input-7-4"
              :value="JSON.stringify(selectedData) | pretty"
              :rows="30"
          ></v-textarea>

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
            {{$t('dataImports.createTypeMapping')}}
          </v-card-title>
          <div v-if="selectedDataSource !== null && mappingDialog">
            <data-type-mapping :dataSourceID="selectedDataSource.id" :containerID="containerID" :payload="importDataMapping" @mappingCreated="mappingDialog = false"></data-type-mapping>
          </div>
        </v-card>
      </v-dialog>
    </v-card>

</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator'
    import {DataSourceT, ImportDataT, ImportT} from "@/api/types";
    import ImportDataDialog from "@/components/importDataDialog.vue";
    import DataTypeMapping from "@/components/dataTypeMapping.vue"

    @Component({filters: {
            pretty: function(value: any) {
                return JSON.stringify(JSON.parse(value), null, 2);
            }
        },
    components: {
        ImportDataDialog,
        DataTypeMapping
    }})
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

        headers = [{
                text: "Created At",
                value: "created_at",
            },
            {
                text: "Status",
                value: "status",
            },
            {
             text: "Message",
             value: "status_message"
            },
            { text: "View/Edit",  value: 'actions', sortable: false },]

        importDataHeaders = [{
          text: "ID",
          value: "id",
        },
        {
          text: "Inserted At",
          value: "inserted_at",
        },
        {
          text: "Errors",
          value: "errors"
        }, {
          text: "Type Mapping",
          value: 'typeMappings'
          },
        {  text: "View/Delete Data", value: 'actions', sortable: false },]



      setDataSource(dataSource: any) {
            this.selectedDataSource = dataSource
            this.listImports()
        }

        listImports() {
            if(this.selectedDataSource) {
                this.$client.listImports(this.containerID, this.selectedDataSource.id)
                    .then(imports => {
                        this.imports = imports
                    })
                    .catch(e => console.log(e))
            }
        }

        mounted() {
          this.$client.listDataSources(this.containerID)
              .then(dataSources => {
                this.dataSources = dataSources
              })
              .catch(e => console.log(e))
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
        this.importData = []
        this.selectedImport = importT
        this.$client.listImportData(this.containerID, importT.id, 1000, 0)
        .then((results) => {
          this.importData = results
          this.dialog = true
        })
        .catch((e: any) => this.errorMessage = e)

      }

      viewImportData(importData: ImportDataT) {
          this.selectedData = importData.data
          this.dataDialog = true
      }

      createTypeMapping(importData: ImportDataT) {
          this.importDataMapping = importData
          this.mappingDialog = true
      }

      mappingCreated() {
        this.mappingDialog = false
        this.successMessage = "Type mapping successfully created, mapping may take up to a minute to be applied."


        this.$client.listImportData(this.containerID, this.selectedImport!.id, 1000, 0)
            .then((results) => {
              this.importData = results
            })
            .catch((e: any) => this.dataErrorMessage= e)
      }

      deleteImportData(importData: ImportDataT) {
        if(importData.inserted_at) {
          this.dataErrorMessage= "Unable to delete data that has already been inserted"
          return
        }

        this.$client.deleteImportData(this.containerID, importData.import_id, importData.id)
            .then(() => {
              this.$client.listImportData(this.containerID, importData.import_id, 1000, 0)
                  .then((results) => {
                    this.importData = results
                  })
                  .catch((e: any) => this.dataErrorMessage= e)
            })
            .catch((e: any) => this.dataErrorMessage= e)
      }
    }
</script>
