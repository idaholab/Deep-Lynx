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
        :item-key="id"
        class="elevation-1"
    >
      <template v-slot:top>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>

        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t("exports.title")}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
          <create-export-dialog :containerID="containerID" @exportCreated="loadExports"></create-export-dialog>
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
      <v-card>
        <v-card-title class="headline grey lighten-2">
          {{$t('exports.warningStopTitle')}}
        </v-card-title>

        <v-card-text>
          {{$t('exports.warningStopBody')}}
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              color="primary"
              text
              @click="stopDialog = false"
          >
           {{$t('exports.ok')}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="resetDialog"
        width="500"
    >
      <v-card>
        <v-card-title class="headline grey lighten-2">
          {{$t('exports.warningResetTitle')}}
        </v-card-title>

        <v-card-text>
          {{$t('exports.warningResetBody')}}
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              color="primary"
              text
              @click="resetDialog = false"
          >
            {{$t('exports.cancel')}}
          </v-btn>
          <v-btn
              color="primary"
              text
              @click="resetExport()"
          >
            {{$t('exports.understandReset')}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="deleteDialog"
        width="500"
    >
      <v-card>
        <v-card-title class="headline grey lighten-2">
          {{$t('exports.warningDeleteTitle')}}
        </v-card-title>

        <v-card-text>
          {{$t('exports.warningDeleteBody')}}
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              color="primary"
              text
              @click="deleteDialog = false"
          >
            {{$t('exports.cancel')}}
          </v-btn>
          <v-btn
              color="primary"
              text
              @click="deleteExport()"
          >
            {{$t('exports.understandDelete')}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Watch, Vue} from 'vue-property-decorator'
import {ExportT} from "@/api/types";
import CreateExportDialog from "@/components/createExportDialog.vue";

@Component({components: {
  CreateExportDialog
  }})
export default class DataExport extends Vue {
  @Prop({required: true})
  readonly containerID!: string;

  successMessage = ""
  errorMessage = ""
  stopDialog = false
  resetDialog = false
  deleteDialog = false
  resetLoading = false
  exportsLoading = false
  exports: ExportT[] = []
  exportsCount = 0
  selectedExportID: string | null = null
  options: {
    sortDesc: boolean[];
    sortBy: string[];
    page: number;
    itemsPerPage: number;
  } = {sortDesc: [false], sortBy: [], page: 1, itemsPerPage: 100}

  @Watch('options')
  onOptionsChange() {
    this.loadExports()
  }

  mounted() {
    this.countExports()
  }

  headers() {
    return  [
      { text: this.$t('exports.destinationType'), value: 'destination_type'},
      { text: this.$t('exports.createdAt'), value: 'created_at'},
      { text: this.$t('exports.status'), value: 'status'},
      { text: this.$t('exports.statusMessage'), value: 'status_message'},
      { text: this.$t('exports.actions'), value: 'actions', sortable: false }
    ]
  }

  countExports() {
    this.$client.listExports(this.containerID, {count: true})
        .then(exportsCount => this.exportsCount = exportsCount as number)
        .catch(e => this.errorMessage = e)
  }

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
  }

  stopExport(dataExport: ExportT) {
    this.stopDialog = true

    this.$client.stopExport(this.containerID, dataExport.id)
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('exports.errorStoppingAPI') as string
          }

          this.loadExports()
        })
  }

  startExport(dataExport: ExportT) {
    this.$client.startExport(this.containerID, dataExport.id)
        .then(result => {
          if(!result) {
            this.errorMessage = this.$t('exports.errorStartingAPI') as string
          }

          this.loadExports()
        })
  }

  resetExportDialog(exportID: string) {
    this.selectedExportID = exportID
    this.resetDialog = true
  }

  resetExport() {
    if(this.selectedExportID) {
      this.resetLoading = true
      this.$client.startExport(this.containerID, this.selectedExportID, true)
          .then(result => {
            if (!result) {
              this.errorMessage = this.$t('exports.errorRestartingAPI') as string
            }

            this.resetDialog = false
            this.loadExports()
            this.resetLoading = false
          })
    }
  }

  deleteExportDialog(exportID: string) {
    this.selectedExportID = exportID
    this.deleteDialog = true
  }

  deleteExport() {
    this.$client.deleteExport(this.containerID, this.selectedExportID!)
        .then(result => {
          if (!result) {
            this.errorMessage = this.$t('exports.errorDeletingAPI') as string
          }

          this.loadExports()
          this.deleteDialog = false
        })
  }
}
</script>
