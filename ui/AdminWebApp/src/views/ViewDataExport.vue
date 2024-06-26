<template>
  <div>
    <v-data-table
      :headers="headers()"
      :items="exports"
      :server-items-length="exportsCount"
      :options.sync="options"
      :loading="exportsLoading"
      :items-per-page="100"
      :footer-props="{
        'items-per-page-options': [25, 50, 100]
      }"
      class="elevation-1"
    >
      <template v-slot:top>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <success-banner :message="successMessage"></success-banner>

        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("exports.graph")}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <CreateExportDialog :containerID="containerID" @exportCreated="loadExports()"></CreateExportDialog>
        </v-toolbar>
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <v-icon
            v-if="item.status === 'processing'"
            @click="stopExport(item)"
        >
          mdi-pause-octagon-outline
        </v-icon>
        <v-icon
            v-if="item.status === 'paused' || item.status === 'created'"
            @click="startExport(item)"
        >
          mdi-play
        </v-icon>
        <v-icon v-if="item.status === 'failed' || item.status === 'paused'"
           @click="resetExportDialog(item.id)"
        >
          mdi-restart
        </v-icon>
        <!-- we do not allow delete if export completed successfully, data tracking reasons -->
        <v-icon
            v-if="item.status !== 'completed'"
            small
            @click="deleteExportDialog(item.id)"
        >
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>

    <v-dialog
        v-model="stopDialog"
        width="500"
    >
      <v-card class="pt-1 pb-3 px-2">
        <v-card-title class="grey lighten-2">
          <span class="headline text-h3">{{$t('exports.stop')}}</span>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col>
              {{$t('warnings.stopExport')}}
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              color="primary"
              text
              @click="stopDialog = false"
          >
           {{$t('general.ok')}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="resetDialog"
        width="500"
    >
      <v-card class="pt-1 pb-3 px-2">
        <v-card-title class="grey lighten-2">
          <span class="headline text-h3">{{$t('exports.reset')}}</span>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col>
              {{$t('warnings.resetExport')}}
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              color="primary"
              text
              @click="resetDialog = false"
          >
            {{$t('general.cancel')}}
          </v-btn>
          <v-btn
              color="primary"
              text
              @click="resetExport()"
          >
            {{$t('exports.resetConfirm')}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="deleteDialog"
        width="500"
    >
      <v-card class="pt-1 pb-3 px-2">
        <v-card-title class="grey lighten-2">
          <span class="headline text-h3">{{$t('exports.delete')}}</span>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col>
              {{$t('warnings.deleteExport')}}
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              color="primary"
              text
              @click="deleteDialog = false"
          >
            {{$t('general.cancel')}}
          </v-btn>
          <v-btn
              color="primary"
              text
              @click="deleteExport()"
          >
            {{$t('exports.deleteConfirm')}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ExportT} from "@/api/types";
  import CreateExportDialog from "@/components/dataExport/CreateExportDialog.vue";

  interface Options {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  }

  interface DataExportModel {
    successMessage: string,
    errorMessage: string,
    stopDialog: boolean,
    resetDialog: boolean,
    deleteDialog: boolean,
    resetLoading: boolean,
    exportsLoading: boolean,
    exportsCount: number,
    exports: ExportT[]
    selectedExportID: string | null
    options: Options
  }

  export default Vue.extend ({
    name: 'ViewDataExport',

    components: { CreateExportDialog },

    props: {
      containerID: {type: String, required: true},
    },

    data(): DataExportModel {
      const options: Options = {
        sortDesc: [false],
        sortBy: [],
        page: 1,
        itemsPerPage: 100,
      }

      return {
        successMessage: "",
        errorMessage: "",
        stopDialog: false,
        resetDialog: false,
        deleteDialog: false,
        resetLoading: false,
        exportsLoading: false,
        exportsCount: 0,
        exports: [],
        selectedExportID: null,
        options
      }
    },

    watch: {
      options: 'loadExports'
    },

    methods: {
      headers() {
        return  [
          { text: this.$t('exports.destinationType'), value: 'destination_type'},
          { text: this.$t('general.dateCreated'), value: 'created_at'},
          { text: this.$t('general.status'), value: 'status'},
          { text: this.$t('general.statusMessage'), value: 'status_message'},
          { text: this.$t('general.actions'), value: 'actions', sortable: false }
        ]
      },
      countExports() {
        this.$client.listExports(this.containerID, {count: true})
            .then(exportsCount => this.exportsCount = exportsCount as number)
            .catch(e => this.errorMessage = e)
      },
      loadExports(){
        this.exportsLoading = true
        this.exports = []

        const {page, itemsPerPage, sortBy, sortDesc} = this.options;
        let sortParam: string | undefined
        let sortDescParam: boolean | undefined

        const pageNumber = page - 1
        if(sortBy && sortBy.length >= 1) sortParam = sortBy[0]
        if(sortDesc) sortDescParam = sortDesc[0]

        this.$client.listExports(this.containerID, {
          limit: itemsPerPage,
          offset: itemsPerPage * pageNumber,
          sortBy: sortParam,
          sortDesc: sortDescParam
        })
            .then((results) => {
              this.exportsLoading = false
              this.exports = results as ExportT[]
              this.$forceUpdate()
            })
            .catch((e: any) => this.errorMessage = e)
      },
      stopExport(dataExport: ExportT) {
        this.stopDialog = true

        this.$client.stopExport(this.containerID, dataExport.id)
            .then(result => {
              if(!result) {
                this.errorMessage = this.$t('errors.errorCommunicating') as string
              }

              this.loadExports()
            })
      },
      startExport(dataExport: ExportT) {
        this.$client.startExport(this.containerID, dataExport.id)
            .then(result => {
              if(!result) {
                this.errorMessage = this.$t('errors.errorCommunicating') as string
              }

              this.loadExports()
            })
      },
      resetExportDialog(exportID: string) {
        this.selectedExportID = exportID
        this.resetDialog = true
      },
      resetExport() {
        if(this.selectedExportID) {
          this.resetLoading = true
          this.$client.startExport(this.containerID, this.selectedExportID, true)
              .then(result => {
                if (!result) {
                  this.errorMessage = this.$t('errors.errorCommunicating') as string
                }

                this.resetDialog = false
                this.loadExports()
                this.resetLoading = false
              })
        }
      },
      deleteExportDialog(exportID: string) {
        this.selectedExportID = exportID
        this.deleteDialog = true
      },
      deleteExport() {
        this.$client.deleteExport(this.containerID, this.selectedExportID!)
            .then(result => {
              if (!result) {
                this.errorMessage = this.$t('errors.errorCommunicating') as string
              }

              this.loadExports()
              this.deleteDialog = false
            })
      }
    },

    mounted() {
      this.countExports()
    }
  });
</script>
