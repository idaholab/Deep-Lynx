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
          <v-toolbar-title>{{$t('apiKeys.title')}}</v-toolbar-title>
          <v-divider
              class="mx-4"
              inset
              vertical
          ></v-divider>
          <v-spacer></v-spacer>
        <create-api-key-dialog></create-api-key-dialog>
        </v-toolbar>
      </template>

      <template v-slot:[`item.actions`]="{ item }">
        <delete-api-key-dialog :key-pair="item" :icon="true" @apiKeyDeleted="refreshKeys()"></delete-api-key-dialog>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator'
import {KeyPairT} from "@/api/types";
import CreateApiKeyDialog from "@/components/createApiKeyDialog.vue";
import DeleteApiKeyDialog from "@/components/deleteApiKeyDialog.vue";

@Component({components:{CreateApiKeyDialog, DeleteApiKeyDialog}})
export default class ApiKeys extends Vue {
  dialog= false
  select = ""
  keyPairs: KeyPairT[] = []
  errorMessage = ""

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
