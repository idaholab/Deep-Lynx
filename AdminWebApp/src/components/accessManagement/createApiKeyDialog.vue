<template>
  <v-dialog v-model="dialog" max-width="700px" @click:outside="errorMessage = ''; dialog = false; returnedKey = null">
    <template v-slot:activator="{ on }">
      <v-btn color="primary" dark class="mt-2" v-on="on">{{$t("createApiKey.createApiKey")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("createApiKey.formTitle")}}</span>
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
        <v-row>
          <v-col :cols="12" v-if="serviceUserID === null">
          <p>{{$t('createApiKey.description')}}</p>
          </v-col>
          <v-col :cols="12" v-else>
            <p>{{$t('createApiKey.descriptionService')}}</p>
          </v-col>
        </v-row>
        <v-row v-if="returnedKey === null">
          <v-text-field :label="$t('createApiKey.note')" v-model="note"></v-text-field>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <div v-if="returnedKey !== null">
          <v-btn color="blue darken-1" text @click="dialog = false; returnedKey = null" >{{$t("createApiKey.close")}}</v-btn>
        </div>
        <div v-else>
          <v-btn color="blue darken-1" text @click="dialog = false; returnedKey = null" >{{$t("createApiKey.cancel")}}</v-btn>
          <v-btn  color="blue darken-1" text @click="generateApiKey">{{$t("createApiKey.create")}}</v-btn>
        </div>

      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Prop,  Vue} from "vue-property-decorator";
import {KeyPairT} from "@/api/types";

@Component
export default class CreateApiKeyDialog extends Vue {
  @Prop({required: false})
  containerID?: string

  @Prop({required: false})
  serviceUserID?: string

  errorMessage = ""
  note = ""
  dialog = false
  returnedKey: KeyPairT | null = null

  generateApiKey() {
    if(this.serviceUserID) {
      this.$client.generateKeyPairForServiceUser(this.containerID!, this.serviceUserID, this.note)
          .then(key => {
            this.returnedKey = key
            this.$emit('apiKeyCreated')
          })
          .catch((e) => this.errorMessage = e)
    } else {
      this.$client.generateKeyPairForUser(this.note)
          .then(key => {
            this.returnedKey = key
            this.$emit('apiKeyCreated')
          })
          .catch((e) => this.errorMessage = e)
    }
  }
}
</script>