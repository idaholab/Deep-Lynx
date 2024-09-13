<template>
  <v-dialog v-model="dialog" @click:outside="reset()"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
        v-if="icon"
        small
        class="mr-2"
        v-on="on"
        @click="isDelete = true"
      >mdi-delete</v-icon>
      <v-btn v-if="!displayIcon" color="primary" dark class="mb-1" v-on="on">{{$t("imports.deleteTitle")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('imports.deleteTitle')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
        <v-row>
          <v-col :cols="12">
            <div>
              <v-alert type="warning">
                {{$t('warnings.deleteImport')}}
                <v-checkbox
                    v-model="withData"
                    :label="$t('imports.deleteData')"
                ></v-checkbox>
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="reset()">{{$t("general.cancel")}}</v-btn>
        <v-btn color="error" text @click="deleteImport()">
          <span>{{$t("general.delete")}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {ImportT} from "@/api/types";

  interface Data {
    errorMessage: string;
    dialog: boolean;
    transformationsLoading: true;
    transformationCount: number;
    deleteLoading: boolean;
    withData: boolean;
    isDelete: boolean;
  }

  interface Methods {
    deleteImport(): void;
    reset(): void;
  }

  interface Computed {
    displayIcon: boolean;
  }

  interface Props {
    containerID: string;
    dataImport: ImportT;
    icon: boolean;
  }

  export default Vue.extend<Data, Methods, Computed, Props> ({
    name: 'DeleteDataImportDialog',

    props: {
      containerID: {required: true, type: String},
      dataImport: {required: true, type: Object as () => ImportT},
      icon: {required: false, default: false, type: Boolean},
    },

    data: () => ({
      errorMessage: "",
      dialog: false,
      transformationsLoading: true,
      transformationCount: 0,
      deleteLoading: false,
      withData: false,
      isDelete: false
    }),

    computed: {
      displayIcon() {
        return this.icon
      }
    },

    methods: {
      deleteImport() {
        this.deleteLoading = true
        this.$client.deleteImport(this.containerID, this.dataImport.id, this.withData)
            .then(() => {
              this.reset()
              this.$emit('dataImportDeleted')
            })
            .catch(e => this.errorMessage = e)
      },
      reset() {
        this.dialog = false
        this.deleteLoading = false
      }
    }
  })
</script>
