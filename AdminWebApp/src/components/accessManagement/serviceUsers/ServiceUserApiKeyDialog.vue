<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false;" max-width="90%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-key</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("apiKeys.manage")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-text style="padding-top: 20px;">
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-data-table
                :headers="headers()"
                :items="keyPairs"
                class="elevation-1"
            >
              <template v-slot:top>
                <v-toolbar flat color="white">
                  <v-toolbar-title>{{$t('apiKeys.description')}}</v-toolbar-title>
                  <v-spacer></v-spacer>
                  <CreateApiKeyDialog :containerID="containerID" :serviceUserID="serviceUserID" @apiKeyCreated="refreshKeys()"></CreateApiKeyDialog>
                </v-toolbar>
              </template>

              <template v-slot:[`item.actions`]="{ item }">
                <DeleteApiKeyDialog :key-pair="item" :icon="true" :containerID="containerID" :serviceUserID="serviceUserID" @apiKeyDeleted="refreshKeys()"></DeleteApiKeyDialog>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {KeyPairT} from "@/api/types";
  import CreateApiKeyDialog from "@/components/accessManagement/CreateApiKeyDialog.vue";
  import DeleteApiKeyDialog from "@/components/accessManagement/DeleteApiKeyDialog.vue";

  interface ServiceUserApiKeyDialogModel {
    keyPairs: KeyPairT[]
    errorMessage: string
    dialog: boolean
  }

  export default Vue.extend ({
    name: 'ServiceUserApiKeyDialog',

    components: { CreateApiKeyDialog, DeleteApiKeyDialog },

    props: {
      containerID: {
        type: String,
        required: true
      },
      serviceUserID: {
        type: String,
        required: true
      },
      icon: {
        type: Boolean,
        required: false
      },
    },

    data: (): ServiceUserApiKeyDialogModel => ({
      keyPairs: [],
      errorMessage: "",
      dialog: false
    }),

    methods: {
      headers() {
        return [
          { text: this.$t('general.key'), value: 'key'},
          { text: this.$t('general.note'), value: 'note'},
          { text: this.$t('general.actions'), value: 'actions', sortable: false }
        ]
      },
      refreshKeys() {
        this.$client.listKeyPairsForServiceUser(this.containerID, this.serviceUserID)
            .then(keys => {
              this.keyPairs = keys
            })
            .catch((e) => this.errorMessage = e)
      }
    },

    mounted() {
      this.refreshKeys()
    }
  });
</script>
