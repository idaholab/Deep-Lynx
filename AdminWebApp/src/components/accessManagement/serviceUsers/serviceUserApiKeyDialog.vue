<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false;" max-width="90%">
    <template v-slot:activator="{ on }">
      <v-icon
          v-if="icon"
          small
          class="mr-2"
          v-on="on"
      >mdi-key</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("serviceUserKeys.manageKeys")}}</v-btn>
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
                  <v-toolbar-title>{{$t('home.apiKeysDescription')}}</v-toolbar-title>
                  <v-spacer></v-spacer>
                  <create-api-key-dialog :containerID="containerID" :serviceUserID="serviceUserID" @apiKeyCreated="refreshKeys()"></create-api-key-dialog>
                </v-toolbar>
              </template>

              <template v-slot:[`item.actions`]="{ item }">
                <delete-api-key-dialog :key-pair="item" :icon="true" :containerID="containerID" :serviceUserID="serviceUserID" @apiKeyDeleted="refreshKeys()"></delete-api-key-dialog>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {KeyPairT} from "@/api/types";
import CreateApiKeyDialog from "@/components/accessManagement/createApiKeyDialog.vue";
import DeleteApiKeyDialog from "@/components/accessManagement/deleteApiKeyDialog.vue";

@Component({components: {CreateApiKeyDialog, DeleteApiKeyDialog}})
export default class ServiceUserApiKeyDialog extends Vue {
  @Prop({required: true})
  containerID!: string;

  @Prop({required: true})
  serviceUserID!: string;

  @Prop({required: false})
  readonly icon!: boolean

  errorMessage = ""
  dialog = false
  keyPairs: KeyPairT[] = []

  headers() {
    return [
      { text: this.$t('apiKeys.key'), value: 'key'},
      { text: this.$t('apiKeys.actions'), value: 'actions', sortable: false }
    ]
  }

  mounted() {
    this.refreshKeys()
  }

  refreshKeys() {
    this.$client.listKeyPairsForServiceUser(this.containerID, this.serviceUserID)
        .then(keys => {
          this.keyPairs = keys
        })
        .catch((e) => this.errorMessage = e)
  }

}

</script>
