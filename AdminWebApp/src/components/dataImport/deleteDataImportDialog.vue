<template>
  <v-dialog v-model="dialog" @click:outside="reset()"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
        v-if="icon"
        small
        class="mr-2"
        v-on="on"
        @click="isDelete = true; initiate()"
      >mdi-delete</v-icon>
      <v-btn v-if="!displayIcon" color="primary" dark class="mb-1" v-on="on">{{$t("deleteDataImport.deleteTypeMapping")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('deleteDataImport.deleteTitle')}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <div>
              <v-alert type="warning">
                {{$t('deleteDataImport.deleteWarning')}}
                <v-checkbox
                    v-model="withData"
                    :label="$t('deleteDataImport.withData')"
                ></v-checkbox>
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("deleteDataImport.cancel")}}</v-btn>
        <v-btn color="error" text :disabled="countDown > 0" @click="deleteImport()">
          <span>{{$t("deleteDataImport.delete")}}</span>
          <span v-if="countDown > 0">{{$t('deleteDataImport.in')}} {{countDown}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {ImportT} from "@/api/types";

@Component
export default class DeleteDataImportDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: true})
  dataImport!: ImportT

  @Prop({required: false, default: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  transformationsLoading = true
  transformationCount = 0
  deleteLoading = false
  timerRunning = false
  countDown = 5
  withData = false

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

  deleteImport() {
    this.deleteLoading = true
    this.$client.deleteImport(this.containerID, this.dataImport.id, this.withData)
        .then(() => {
          this.reset()
          this.$emit('dataImportDeleted')
        })
        .catch(e => this.errorMessage = e)
  }

  reset() {
    this.dialog = false
    this.deleteLoading = false
    this.timerRunning = false
  }
}
</script>