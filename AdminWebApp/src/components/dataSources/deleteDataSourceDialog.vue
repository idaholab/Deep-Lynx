<template>
  <v-dialog v-model="dialog" @click:outside="reset()"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="displayIcon === 'archive' || displayIcon === 'both' && displayIcon !== 'none'"
          small
          class="mr-2"
          v-on="on"
          @click="isArchive = true"
      >mdi-archive</v-icon>
      <v-icon
          v-if="displayIcon === 'trash' || displayIcon === 'both' && displayIcon !== 'none'"
          small
          class="mr-2"
          v-on="on"
          @click="isDelete = true; initiate()"
      >mdi-delete</v-icon>
      <v-btn v-if="displayIcon ==='none'" color="primary" dark class="mb-2" v-on="on">{{$t("deleteDataSource.deleteDataSource")}}</v-btn>
    </template>

    <v-card v-if="isDelete">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('deleteDataSource.deleteTitle')}}</span>
          <v-row>
            <v-col :cols="12">
              <v-progress-linear v-if="importsLoading" indeterminate></v-progress-linear>
              <div v-else>
                <v-alert type="warning">
                  {{$t('deleteDataSource.deleteWarning')}}
                </v-alert>

                <v-alert type="error" v-if="importCount > 0">
                  {{$t('deleteDataSource.forceDeleteWarning')}}
                </v-alert>

                <v-alert type="error" v-if="importCount > 0">
                  {{$t('deleteDataSource.withDataWarning')}}
                  <v-checkbox
                      v-model="withData"
                      :label="$t('deleteDataSource.withData')"
                  ></v-checkbox>
                </v-alert>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions v-if="!importsLoading">
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="reset()">{{$t("deleteDataSource.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="archiveSource()" v-if="!dataSource.archived">
          <v-progress-circular v-if="archiveLoading" indeterminate></v-progress-circular>
          {{$t("deleteDataSource.archive")}}
        </v-btn>
        <v-btn color="red darken-1" text :disabled="countDown > 0" @click="deleteSource()">
          <v-progress-circular v-if="deleteLoading" indeterminate></v-progress-circular>
          <span v-if="importCount <= 0">{{$t("deleteDataSource.delete")}}</span>
          <span v-else>{{$t("deleteDataSource.forceDelete")}}</span>
          <span v-if="countDown > 0">{{$t('deleteDataSource.in')}} {{countDown}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-if="isArchive">
      <v-card-text>
        <v-container>
          <error-banner :message="errorMessage"></error-banner>
          <span class="headline">{{$t('deleteDataSource.archiveTitle')}}</span>
          <v-row>
            <v-col :cols="12">
              <v-alert type="warning">
                {{$t('deleteDataSource.archiveWarning')}}
              </v-alert>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="reset()">{{$t("deleteDataSource.cancel")}}</v-btn>
        <v-btn color="blue darken-1" text @click="archiveSource()">{{$t("deleteDataSource.archive")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {DataSourceT} from "@/api/types";

@Component
export default class DeleteDataSourceDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: true})
  dataSource!: DataSourceT

  @Prop({required: false, default: "none"})
  readonly icon!: "trash" | "archive" | "both" | "none"

  errorMessage = ""
  dialog = false
  isDelete = false
  isArchive = false
  importsLoading = true
  importCount = 0
  deleteLoading = false
  archiveLoading = false
  timerRunning = false
  withData = true
  countDown = 5

  get displayIcon() {
    return this.icon
  }

  initiate() {
    this.$client.countImports(this.containerID, this.dataSource!.id!)
    .then((count) => {
      this.importCount = count
      this.importsLoading = false
      this.startCountdown()
    })
    .catch(e => this.errorMessage = e)
  }

  startCountdown() {
    this.countDown = 5

    if(!this.timerRunning) this.countdown()
  }

  countdown() {
    if(this.countDown > 0) {
      setTimeout(() => {
        this.countDown -= 1
        this.timerRunning = true
        this.countdown()
      }, 1000)
    } else {
      this.timerRunning = false
    }
  }

  deleteSource() {
    this.deleteLoading = true
    this.$client.deleteDataSources(
        this.containerID,
        this.dataSource!.id!,
        {forceDelete: true, withData: this.withData})
    .then(() => {
      this.reset()
      this.$emit('dataSourceDeleted')
    })
    .catch(e => this.errorMessage = e)
  }

  archiveSource() {
    this.archiveLoading = true
    this.$client.deleteDataSources(this.containerID, this.dataSource!.id!,
        {forceDelete: false, archive: true})
        .then(() => {
          this.reset()
          this.$emit('dataSourceArchived')
        })
        .catch((e: any) => this.errorMessage = e)
  }

  reset() {
    this.dialog = false
    this.isDelete = false
    this.isArchive = false
    this.deleteLoading = false
    this.archiveLoading = false
    this.importsLoading = true
    this.timerRunning = false
    this.withData = true
  }
}
</script>