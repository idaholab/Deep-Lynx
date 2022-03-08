<template>
  <v-dialog v-model="dialog" max-width="700px" @click:outside="errorMessage = ''; dialog = false; returnedKey = null">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mb-2" v-on="on">{{$t("createApiKey.createApiKey")}}</v-btn>
    </template>
    <v-card>
      <v-card-title>
        <span class="headline">{{$t("createApiKey.formTitle")}}</span>
      </v-card-title>

      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-alert type="success" v-if="returnedKey" class="multi-line">
          <p>{{$t('createApiKey.successfullyCreated')}}</p>
          <p><strong>{{$t('createApiKey.key')}}</strong></p>
          <p>{{returnedKey.key}}</p>
          <p><strong>{{$t('createApiKey.secret')}}</strong></p>
          <p>{{returnedKey.secret_raw}}</p>
        </v-alert>
        <v-container>
          <v-row>
            <v-col :cols="12">
            <p>{{$t('createApiKey.description')}}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false; returnedKey = null" >{{$t("createApiKey.cancel")}}</v-btn>
        <v-btn  color="blue darken-1" text @click="generateApiKey">{{$t("createApiKey.create")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator";
import {KeyPairT} from "@/api/types";

@Component
export default class CreateApiKeyDialog extends Vue {
  errorMessage = ""
  dialog = false
  returnedKey: KeyPairT | null = null

  generateApiKey() {
    this.$client.generateKeyPairForUser()
    .then(key => {
      this.returnedKey = key
    })
    .catch((e) => this.errorMessage = e)
  }
}
</script>