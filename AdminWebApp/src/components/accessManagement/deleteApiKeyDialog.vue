<template>
  <v-dialog v-model="dialog" @click:outside="dialog = false"  max-width="60%">
    <template v-slot:activator="{ on }">
      <v-icon
        v-if="icon"
        small
        class="mr-2"
        v-on="on"
      >
        mdi-delete
      </v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("apiKeys.delete")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('apiKeys.delete')}}</span>
      </v-card-title>   
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
              <v-alert type="warning">
                {{$t('warnings.deleteApiKey')}}
              </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false">{{$t("general.cancel")}}</v-btn>
        <v-btn color="error" text @click="deleteApiKey">
          <span>{{$t("general.delete")}}</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue'
  import {KeyPairT} from "@/api/types";

  interface DeleteApiKeyDialogModel {
    errorMessage: string
    dialog: boolean
  }

  export default Vue.extend ({
    name: 'DeleteApiKeyDialog',

    props: {
      containerID: {
        type: String,
        required: false
      },
      serviceUserID: {
        type: String,
        required: false
      },
      keyPair: {
        type: Object as PropType<KeyPairT>,
        required: true
      },
      icon: {
        type: Boolean,
        required: false,
        default: false
      },
    },

    data: (): DeleteApiKeyDialogModel => ({
      errorMessage: "",
      dialog: false
    }),

    methods: {
      deleteApiKey() {
        if(this.serviceUserID) {
          this.$client.deleteKeyPairForServiceUser(this.containerID!, this.serviceUserID, this.keyPair.key)
              .then(() => {
                this.dialog = false
                this.$emit('apiKeyDeleted')
              })
              .catch(e => this.errorMessage = e)
        } else {
          this.$client.deleteKeyPairForUser(this.keyPair.key)
              .then(() => {
                this.dialog = false
                this.$emit('apiKeyDeleted')
              })
              .catch(e => this.errorMessage = e)
        }
      }
    }
  })
</script>