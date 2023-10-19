<template>
  <div>
    <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
    <v-data-table
        :headers="headers()"
        :items="keyPairs"
        class="elevation-1"
    >
      <template v-slot:top>
        <v-toolbar flat color="white">
          <v-toolbar-title>{{$t('apiKeys.description')}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <ApiKeyActions
            mode="create"
            :icon="false"
            :maxWidth="'700px'"
            @apiKeyCreated="refreshKeys()"
          />
        </v-toolbar>
      </template>

      <template v-slot:[`item.actions`]="{ item }">
        <ApiKeyActions
          mode="delete"
          :icon="true"
          :key-pair="item"
          :maxWidth="'60%'"
          @apiKeyDeleted="refreshKeys()"
        />
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {KeyPairT} from "@/api/types";
  import ApiKeyActions from '@/components/accessManagement/ApiKeyActions.vue';

  interface ApiKeysModel {
    dialog: boolean,
    select: string,
    errorMessage: string,
    keyPairs: KeyPairT[]
  }

  export default Vue.extend ({
    name: 'ViewApiKeys',

    components: { 
      ApiKeyActions 
    },

    data: (): ApiKeysModel => ({
      dialog: false,
      select: "",
      errorMessage: "",
      keyPairs: []
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
        this.$client.listKeyPairsForUser()
        .then(keys => {
          this.keyPairs = keys
        })
        .catch((e) => this.errorMessage = e)
      },
      copyID(id: string) {
        navigator.clipboard.writeText(id)
      }
    },

    mounted() {
      this.refreshKeys()
    }
  })
</script>
