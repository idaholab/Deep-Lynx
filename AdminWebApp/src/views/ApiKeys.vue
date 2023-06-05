<template>
  <div>
    <error-banner :message="errorMessage"></error-banner>
    <v-data-table
        :headers="headers()"
        :items="keyPairs"
        class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('apiKeys.description')}}</v-toolbar-title>
          <v-spacer></v-spacer>
        <create-api-key-dialog @apiKeyCreated="refreshKeys()"></create-api-key-dialog>
        </v-toolbar>
      </template>

      <template v-slot:[`item.actions`]="{ item }">
        <delete-api-key-dialog :key-pair="item" :icon="true" @apiKeyDeleted="refreshKeys()"></delete-api-key-dialog>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {Component,Vue} from 'vue-property-decorator'
import {KeyPairT} from "@/api/types";
import CreateApiKeyDialog from "@/components/accessManagement/createApiKeyDialog.vue";
import DeleteApiKeyDialog from "@/components/accessManagement/deleteApiKeyDialog.vue";

@Component({components:{CreateApiKeyDialog, DeleteApiKeyDialog}})
export default class ApiKeys extends Vue {
  dialog= false
  select = ""
  keyPairs: KeyPairT[] = []
  errorMessage = ""

  headers() {
    return [
      { text: this.$t('general.key'), value: 'key'},
      { text: this.$t('general.note'), value: 'note'},
      { text: this.$t('general.actions'), value: 'actions', sortable: false }
    ]
  }

  mounted() {
    this.refreshKeys()
  }

  refreshKeys() {
    this.$client.listKeyPairsForUser()
    .then(keys => {
      this.keyPairs = keys
    })
    .catch((e) => this.errorMessage = e)
  }


  copyID(id: string) {
    navigator.clipboard.writeText(id)
  }
}
</script>
