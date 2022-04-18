<template>
  <v-dialog v-model="dialog" @click:outside="reset()"  max-width="60%">
    <template v-slot:activator="{ on: dialog }">
      <v-tooltip bottom v-if="icon">
        <template v-slot:activator="{on: tooltip, attrs}">
          <v-icon
              v-if="icon"
              small
              class="mr-2"
              v-bind="attrs"
              v-on="{...dialog, ...tooltip}"
              @click="initiate()"
          >mdi-restore</v-icon>
        </template>
       <span>{{$t('reprocessDataSource.tooltip')}}</span>
      </v-tooltip>

      <v-btn v-if="!displayIcon" color="primary" dark class="mb-1" v-on="on">{{$t("reprocessDataSource.reprocessImport")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('reprocessDataSource.title')}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <div>
              <v-alert type="warning">
                {{$t('reprocessDataSource.warning')}}
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <div v-if="!loading">
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="reset()">{{$t("reprocessDataSource.cancel")}}</v-btn>
          <v-btn color="red darken-1" text :disabled="countDown > 0" @click="reprocessImport()">
            <span>{{$t("reprocessDataSource.reprocess")}}</span>
            <span v-if="countDown > 0">{{$t('reprocessDataSource.in')}} {{countDown}}</span>
          </v-btn>
        </div>
       <v-progress-linear indeterminate v-if="loading"></v-progress-linear>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {DataSourceT} from "@/api/types";

@Component
export default class ReprocessDataSourceDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: true})
  dataSource!: DataSourceT

  @Prop({required: false, default: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  loading = false
  timerRunning = false
  countDown = 5

  get displayIcon() {
    return this.icon
  }

  initiate() {
     this.startCountdown()
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

  reprocessImport() {
    this.loading = true
    this.$client.reprocessDataSource(this.containerID, this.dataSource.id!)
        .then(() => {
          this.reset()
          this.$emit('dataSourceReprocessed')
        })
        .catch(e => this.errorMessage = e)
  }

  reset() {
    this.dialog = false
    this.loading = false
    this.timerRunning = false
    this.errorMessage = ''
  }
}
</script>