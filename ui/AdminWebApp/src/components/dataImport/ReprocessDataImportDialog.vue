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
          >mdi-restore</v-icon>
        </template>
       <span>{{$t('imports.reprocessDescription')}}</span>
      </v-tooltip>

      <v-btn v-if="!displayIcon" color="primary" dark class="mb-1" v-on="{...dialog}">{{$t("imports.reprocessTitle")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('imports.reprocessTitle')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <div>
              <v-alert type="warning">
                {{$t('warnings.reprocessImport')}}
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <div v-if="!loading">
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="reset()">{{$t("general.cancel")}}</v-btn>
          <v-btn color="error" text @click="reprocessImport()">
            <span>{{$t("general.reprocess")}}</span>
          </v-btn>
        </div>
       <v-progress-linear indeterminate v-if="loading"></v-progress-linear>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ImportT} from "@/api/types";

  interface Props {
    containerID: string;
    dataImport: ImportT;
    icon: boolean;
  }

  interface Data {
    errorMessage: string;
    dialog: boolean;
    loading: boolean;
  }

  interface Computed {
    displayIcon: boolean;
  }

  interface Methods {
    reprocessImport(): void;
    reset(): void;
  }

  export default Vue.extend<Data, Methods, Computed, Props>({
    name: 'ReprocessDataImportDialog',

    props: {
      containerID: {required: true, type: String},
      dataImport: {required: true, type: Object as () => ImportT},
      icon: {required: false, default: false, type: Boolean},
    },

    data: () => ({
      errorMessage: "",
      dialog: false,
      loading: false,
    }),

    computed: {
      displayIcon() {
        return this.icon
      }
    },

    methods: {
      reprocessImport() {
        this.loading = true
        this.$client.reprocessImport(this.containerID, this.dataImport.id)
            .then(() => {
              this.reset()
              this.$emit('dataImportReprocessed')
            })
            .catch(e => this.errorMessage = e)
      },
      reset() {
        this.dialog = false
        this.loading = false
        this.errorMessage = ''
      }
    }
  })
</script>
