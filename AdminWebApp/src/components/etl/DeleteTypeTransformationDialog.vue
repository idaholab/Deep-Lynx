<template>
  <v-dialog v-model="dialog" @click:outside="reset()"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
        v-if="icon === 'archive' || icon === 'both'"
        small
        class="mr-2"
        v-on="on"
        @click="isArchive = true"
      >mdi-archive</v-icon>
      <v-icon
        v-if="icon === 'trash' || icon === 'both'"
        small
        class="mr-2"
        v-on="on"
        @click="isDelete = true; initiate()"
      >mdi-delete</v-icon>
      <v-btn v-if="icon ==='none'" color="primary" dark class="mt-2" v-on="on">{{$t("transformations.delete")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2" v-if="isDelete">
      <v-card-title>
        <span class="headline text-h3">{{$t('transformations.deletePermanently')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-progress-linear v-if="inUseLoading" indeterminate></v-progress-linear>
            <div v-else>
              <v-alert type="warning">
                {{$t('warnings.deleteTransformation')}}
              </v-alert>

              <v-alert type="error" v-if="inUse">
                {{$t('warnings.forceDeleteTransformation')}}
              </v-alert>

              <v-alert type="error" v-if="inUse">
                {{$t('warnings.dataDeleteTransformation')}}
                <v-checkbox
                  v-model="withData"
                  :label="$t('transformations.deleteWithData')"
                ></v-checkbox>
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions v-if="!inUseLoading">
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="archiveSource()" v-if="!transformation.archived">
          <v-progress-circular v-if="archiveLoading" indeterminate></v-progress-circular>
          {{$t("general.archive")}}
        </v-btn>
        <v-btn color="error" text :disabled="countDown > 0" @click="deleteSource()">
          <v-progress-circular v-if="deleteLoading" indeterminate></v-progress-circular>
          <span v-if="!inUse">{{$t("general.delete")}}</span>
          <span v-else>{{$t("general.forceDelete")}}</span>
          <span v-if="countDown > 0">{{$t('operators.in')}} {{countDown}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card class="pt-1 pb-3 px-2" v-if="isArchive">
      <v-card-title>
        <span class="headline text-h3">{{$t('transformations.archive')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">
              {{$t('warnings.archiveTransformation')}}
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="archiveSource()">{{$t("transformations.archive")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import {TypeMappingTransformationT} from "@/api/types";

interface DeleteTypeTransformationDialogModel {
  errorMessage: string;
  dialog: boolean;
  isDelete: boolean;
  isArchive: boolean;
  inUseLoading: boolean;
  inUse: boolean;
  deleteLoading: boolean;
  archiveLoading: boolean;
  timerRunning: boolean;
  withData: boolean;
  countDown: number;
}

export default Vue.extend({
  name: 'DeleteTypeTransformationDialog',

  props: {
    containerID: {type: String, required: true},
    dataSourceID: {type: String, required: true},
    transformation: {
      type: Object as PropType<TypeMappingTransformationT>,
      required: true
    },
    icon: {
      type: String as PropType<"trash" | "archive" | "both" | "none">,
      required: false, 
      default: "none"
    }
  },

  data: (): DeleteTypeTransformationDialogModel => ({
    errorMessage: '',
    dialog: false,
    isDelete: false,
    isArchive: false,
    inUseLoading: true,
    inUse: false,
    deleteLoading: false,
    archiveLoading: false,
    timerRunning: false,
    withData: true,
    countDown: 1,
  }),

  methods: {
    initiate() {
      // check to see if it's in-use, should return 'true' if in use
      this.$client.deleteTransformation(
        this.containerID,
        this.dataSourceID,
        this.transformation.type_mapping_id,
        this.transformation.id,
        {inUse: true}
      )
        .then((result) => {
          this.inUse = result
          this.inUseLoading = false
          this.startCountdown()
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
    deleteSource() {
      this.deleteLoading = true;
      this.$client.deleteTransformation(
        this.containerID,
        this.dataSourceID,
        this.transformation.type_mapping_id,
        this.transformation.id,
        {forceDelete: true, withData: this.withData}
      )
        .then(() => {
          this.reset()
          this.$emit('transformationDeleted')
        })
        .catch(e => this.errorMessage = e)
    },
    archiveSource() {
      this.archiveLoading = true
      this.$client.deleteTransformation(
        this.containerID,
        this.dataSourceID,
        this.transformation.type_mapping_id,
        this.transformation.id,
        {forceDelete: false, archive: true}
      )
        .then(() => {
          this.reset()
          this.$emit('transformationArchived')
        })
        .catch(e => this.errorMessage = e)
    },
    reset() {
      this.dialog = false
      this.isDelete = false
      this.isArchive = false
      this.deleteLoading = false
      this.archiveLoading = false
      this.inUseLoading = true
      this.timerRunning = false
      this.withData = true
    }
  }
});
</script>