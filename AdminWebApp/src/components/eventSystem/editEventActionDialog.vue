<template>
  <v-dialog v-model="dialog" @click:outside="editReset();" max-width="70%">
    <template v-slot:activator="{on}">
      <v-icon
        v-if="icon"
        small
        class="mr-2"
        v-on="on"
      >mdi-pencil</v-icon>
      <v-btn v-if="!icon" color="primary" dark class="mt-2" v-on="on">{{$t("events.editAction")}}</v-btn>
    </template>

    <v-card class="pt-1 pb-3 px-2">
      <v-card-title>
        <span class="headline text-h3">{{$t("events.editAction")}}</span>
      </v-card-title>
      <v-card-text>
        <error-banner :message="errorMessage"></error-banner>
        <v-row>
          <v-col :cols="12">
            <v-form
              ref="form"
              v-model="valid"
            >
              <v-select
                  v-model="eventAction.action_type"
                  :items="actionType()"
                  :label="$t('events.actionType')"
                  :rules="[v => !!v || $t('validation.required')]"
              >
              </v-select>

              <v-select
                    v-model="eventAction.event_type"
                    :items="eventType()"
                    :label="$t('events.eventType')"
                    :rules="[v => !!v || $t('validation.required')]"
              >
              </v-select>

              <select-data-source v-if="!(['data_source_created', 'data_source_modified', 'data_exported'].includes(eventAction.event_type))"
                :containerID="containerID"
                :show-archived="true"
                :dataSourceID="eventAction.data_source_id"
                :noIndent="true"
                :label="dataSourceLabel"
                @selected="setDataSourceID"
              >
              </select-data-source>

              <template>
                <v-text-field v-if="eventAction.action_type === 'email_user'"
                    v-model="eventAction.destination"
                    :label="$t('events.destinationEmail')"
                    :rules="[v => !!v || $t('validation.required')]"
                ></v-text-field>
                <v-text-field v-else
                    v-model="eventAction.destination"
                    :append-icon="send ? 'mdi-send' : 'mdi-send-check'"
                    @click:append="sendEvent"
                    :label="$t('edges.destination')"
                    :rules="[v => !!v || $t('validation.required')]"
                ></v-text-field>
              </template>

              <v-text-field v-if="eventAction.event_type === 'manual'"
                v-model="eventAction.destination_data_source_id"
                :label="$t('events.destinationDataSource')"
              ></v-text-field>

              <v-checkbox
                    v-model="eventAction.active"
                    :label="$t('general.enable')"
              ></v-checkbox>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="editReset()" >{{$t("general.cancel")}}</v-btn>
        <v-btn color="primary" text @click="updateEventAction()" >{{$t("general.save")}}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EventActionT, DataSourceT } from '@/api/types';
import SelectDataSource from '../dataSources/selectDataSource.vue';
import axios from 'axios';
import { AxiosResponse, AxiosRequestConfig } from 'axios';

@Component({components:{
  SelectDataSource
}})

export default class EditEventActionDialog extends Vue {
  @Prop({required: true})
  containerID!: string

  @Prop({required: false, default: true})
  readonly icon!: boolean

  @Prop({required: true})
  eventAction!: EventActionT
  
  dataSourceLabel = (this.$t('dataSources.dataSource') as string)
  destinationLabel = (this.$t('events.destinationDataSource') as string)
  errorMessage = ""
  dialog = false
  valid = false
  select: string | null = ""
  send = true
  selectedDataSource: DataSourceT | null = null
  selectedDestinationDataSource: DataSourceT | null = null

  async sendEvent () {
    const config: AxiosRequestConfig = {};
    config.headers = {'Access-Control-Allow-Origin': '*'};
    config.validateStatus = () => {
        return true;
    };

    try {
      const resp: AxiosResponse = await axios.post(this.eventAction.destination!, {id: 'test', event: 'test'}, config)

      if (resp.status < 200 || resp.status > 299) {
        this.errorMessage = `${this.$t('errors.statusCode')} ${resp.status}. ${resp.statusText}`
      }
      else {
        this.send = !this.send
        this.errorMessage = ''
      }
    } catch(e: any) {
      this.errorMessage = e
    }
  }

  setDataSourceID(dataSource: any) {
      this.selectedDataSource = dataSource
  }

  eventType() {
        return  [
            {text: this.$t('events.dataImported'), value: 'data_imported'},
            {text: this.$t('events.dataIngested'), value: 'data_ingested'},
            {text: this.$t('events.fileCreated'), value: 'file_created'},
            {text: this.$t('events.fileModified'), value: 'file_modified'},
            {text: this.$t('events.dataSourceCreated'), value: 'data_source_created'},
            {text: this.$t('events.dataSourceModified'), value: 'data_source_modified'},
            {text: this.$t('events.dataExported'), value: 'data_exported'},
            {text: this.$t('events.manual'), value: 'manual'},
        ]
  }

  actionType() {
        return  [
            {text: this.$t('general.default'), value: 'default'},
            {text: this.$t('events.sendData'), value: 'send_data'},
            {text: this.$t('events.emailUser'), value: 'email_user'},
        ]
  }

  updateEventAction() {
    this.eventAction.container_id = this.containerID

    if(this.selectedDataSource) {this.eventAction.data_source_id = this.selectedDataSource.id}

    this.$client.updateEventAction(this.eventAction)
        .then((event)=> {
          this.$emit("eventActionUpdated", event)

          this.dialog = false
          this.errorMessage = ""
        })
        .catch(e => this.errorMessage = e)
  }

  editReset() {
    this.$client.retrieveEventAction(this.eventAction.id!)
      .then((eventAction) => {
        this.eventAction = eventAction

        this.dialog = false
        this.errorMessage = ""
      })
      .catch(e => this.errorMessage = e)
      .finally(() => this.dialog = false)
  }
}
</script>