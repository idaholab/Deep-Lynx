<template>
  <v-dialog v-model="dialog" @click:outside="reset()" max-width="70%">
    <template v-slot:activator="{on}">
      <v-icon
        v-if="icon"
        small
        class="mr-2"
        v-on="on"
      >mdi-send</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("sendEventAction.formTitle")}}</v-btn>
    </template>
    
    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t('sendEventAction.formTitle')}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <success-banner :message="successMessage"></success-banner>
        <v-row>
          <v-col :cols="12">
            <v-alert v-if="successMessage === ''"
              type="warning"
              elevation="2"
            >
              {{$t('sendEventAction.sendQuestion')}}
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn 
          color="blue darken-1" 
          text
          @click="reset(); dialog = false" 
        >{{successMessage === '' ? $t("home.cancel") : "Close"}}</v-btn>
        <v-btn v-if="successMessage === ''"
          color="blue darken-1" 
          text 
          @click="sendEvent()" 
        >{{$t("sendEventAction.send")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EventActionT } from '@/api/types';
import axios from 'axios';
import { AxiosResponse, AxiosRequestConfig } from 'axios';

@Component

export default class SendEventActionDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: false, default: true})
  readonly icon!: boolean

  @Prop({required: true})
  eventAction!: EventActionT
  
  errorMessage = ""
  successMessage = ""
  dialog = false

  async sendEvent () {
    const config: AxiosRequestConfig = {};
    config.headers = {'Access-Control-Allow-Origin': '*'};
    config.validateStatus = () => {
        return true;
    };

    try {
      const resp: AxiosResponse = await axios.post(this.eventAction.destination!, {id: 'test', event: 'test'}, config)

      if (resp.status < 200 || resp.status > 299) {
        this.errorMessage = `Request unsuccessful. Status code ${resp.status}. ${resp.statusText}`
      }
      else {
        this.successMessage = 'Request was successful!'
        this.errorMessage = ''
      }
    } catch(e: any) {
      this.errorMessage = e
    }
  }

  reset() {
    this.dialog = false
    this.errorMessage = ""
    this.successMessage = ""
  }
}
</script>