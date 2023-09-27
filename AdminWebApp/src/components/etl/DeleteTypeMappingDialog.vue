<template>
  <v-dialog v-model="dialog" @click:outside="reset()"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
          @click="initiate()"
      >mdi-delete</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("typeMappings.delete")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('typeMappings.delete')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-progress-linear v-if="transformationsLoading" indeterminate></v-progress-linear>
            <div v-else>
              <v-alert type="warning" v-if="transformationCount <= 0">
                {{$t('warnings.deleteMapping')}}
              </v-alert>

              <v-alert type="error" v-else>
                {{$t('errors.deleteMappings')}}
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions v-if="!transformationsLoading">
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("general.cancel")}}</v-btn>
        <v-btn v-if="transformationCount <= 0" color="error" text :disabled="countDown > 0" @click="deleteMapping()">
          <v-progress-circular v-if="deleteLoading" indeterminate></v-progress-circular>
          <span>{{$t("general.delete")}}</span>
          <span v-if="countDown > 0">{{$t('operators.in')}} {{countDown}}</span>
        </v-btn>
        <v-btn v-else color="error" text disabled>
          <span>{{$t("general.delete")}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue';

interface DeleteTypeMappingDialogModel {
  errorMessage: string;
  dialog: boolean;
  transformationsLoading: boolean;
  transformationCount: number;
  deleteLoading: boolean;
  timerRunning: boolean;
  countDown: number;
}

export default Vue.extend ({
  name: 'DeleteTypeMappingDialog',

  props: {
    containerID: {type: String, required: true},
    dataSourceID: {type: String, required: true},
    mappingID: {type: String, required: true},
    icon: {type: Boolean, required: false, default: false},
  },

  data: (): DeleteTypeMappingDialogModel => ({
    errorMessage: "",
    dialog: false,
    transformationsLoading: true,
    transformationCount: 0,
    deleteLoading: false,
    timerRunning: false,
    countDown: 1,
  }),

  methods: {
    initiate() {
      this.$client.retrieveTransformations(this.containerID, this.dataSourceID, this.mappingID)
          .then((transformations) => {
            this.transformationsLoading = false
            this.transformationCount = transformations.length

            // we only allow delete on no transformations
            if(this.transformationCount <= 0) this.startCountdown()
          })
          .catch(e => this.errorMessage = e)
    },
    startCountdown() {
      this.countDown = 1

      if(!this.timerRunning) this.countdown()
    },
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
    },
    deleteMapping() {
      this.deleteLoading = true
      this.$client.deleteTypeMapping(this.containerID, this.dataSourceID, this.mappingID)
          .then(() => {
            this.reset()
            this.$emit('typeMappingDeleted')
          })
          .catch(e => this.errorMessage = e)
    },
    reset() {
      this.dialog = false
      this.deleteLoading = false
      this.timerRunning = false
      this.transformationsLoading = true
      this.transformationCount = 0
    }
  }
})
</script>
