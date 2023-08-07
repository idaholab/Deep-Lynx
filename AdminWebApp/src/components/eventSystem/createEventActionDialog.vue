<template>
    <v-dialog v-model="dialog" max-width="80%" @click:outside="clearNewEvent()">
      <template v-slot:activator="{ on }">
        <v-btn color="primary" dark class="mt-2" v-on="on">{{$t("events.newAction")}}</v-btn>
      </template>

      <v-card class="pt-1 pb-3 px-2">
        <v-card-title>
          <span class="headline text-h3">{{$t("events.createAction")}}</span>
        </v-card-title>
        <v-card-text>
          <error-banner :message="errorMessage"></error-banner>
          <v-row>
            <v-col :cols="12">
              <v-form
                  ref="form"
                  v-model="valid"
                  lazy-validation
              >
                <v-select
                      v-model="eventAction.action_type"
                      :items="actionType()"
                      @input="selectActionType"
                      :label="$t('events.actionType')"
                      :rules="[v => !!v || $t('validation.required')]"
                >
                </v-select>

                <v-select
                    v-model="eventAction.event_type"
                    :items="eventType()"
                    @input="selectEventType"
                    :label="$t('events.eventType')"
                    :rules="[v => !!v || $t('validation.required')]"
                >
                </v-select>

                <SelectDataSource v-if="!(['data_source_created', 'data_source_modified', 'data_exported'].includes(eventAction.event_type))"
                  :containerID="containerID"
                  :show-archived="true"
                  :noIndent="true"
                  :label="dataSourceLabel"
                  @selected="setDataSourceID"
                  :clear="dataSourceClear"
                >
                </SelectDataSource>
                
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
          <v-btn color="primary" text @click="clearNewEvent()" >{{$t("general.cancel")}}</v-btn>
          <v-btn color="primary" text @click="createEventAction()" >{{$t("general.create")}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>

  <script lang="ts">
  import {Component, Prop, Vue} from "vue-property-decorator"
  import {
    EventActionT,
    DataSourceT
  } from "@/api/types";
  import SelectDataSource from "../dataSources/SelectDataSource.vue";
  import axios from "axios";
  import { AxiosResponse, AxiosRequestConfig } from "axios";

  @Component({components:{
    SelectDataSource
  }})
  export default class CreateEventActionDialog extends Vue {
    @Prop({required: true})
    readonly containerID!: string;

    @Prop({required: false, default: true})
    readonly icon!: boolean

    @Prop({required: false, default: false})
    showArchived!: boolean

    dataSourceID?: string | string[]

    dataSourceLabel = (this.$t('dataSources.dataSource') as string)
    destinationLabel = (this.$t('events.destinationDataSource') as string)
    errorMessage = ""
    dialog= false
    valid = true
    select: string | null = ""
    send = true
    loading = true
    selectedDataSource: DataSourceT | null = null
    selectedDestinationDataSource: DataSourceT | null = null
    selected: DataSourceT | DataSourceT[] | null = null
    dataSourceClear = false
    
    eventAction: EventActionT = {
      container_id: "",
      data_source_id: undefined,
      event_type: undefined,
      action_type: undefined,
      destination_data_source_id: undefined,
      active: false,
    }

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
        // List of event types that the user can choose from
        const types =  [
            {text: this.$t('events.dataImported'), value: 'data_imported'},
            {text: this.$t('events.dataIngested'), value: 'data_ingested'},
            {text: this.$t('events.fileCreated'), value: 'file_created'},
            {text: this.$t('events.fileModified'), value: 'file_modified'},
            {text: this.$t('events.dataSourceCreated'), value: 'data_source_created'},
            {text: this.$t('events.dataSourceModified'), value: 'data_source_modified'},
            {text: this.$t('events.dataExported'), value: 'data_exported'},
            {text: this.$t('events.manual'), value: 'manual'},
        ]
        return types
    }

    actionType() {
        // List of action types that the user can choose from
        const types =  [
            {text: this.$t('general.default'), value: 'default'},
            {text: this.$t('events.sendData'), value: 'send_data'},
            {text: this.$t('events.emailUser'), value: 'email_user'},
        ]
        return types
    }

    selectEventType(event: string) {
    this.eventAction.event_type = event
    }

    selectActionType(action: string) {
    this.eventAction.action_type = action
    }

    createEventAction() {
      // @ts-ignore
      if(!this.$refs.form!.validate()) return;

      this.eventAction.container_id = this.containerID

      if(this.selectedDataSource) {this.eventAction.data_source_id = this.selectedDataSource.id}

      this.$client.createEventAction(this.eventAction)
          .then((event)=> {
            this.clearNewEvent()
            this.$emit("eventCreated", event)
          })
          .catch(e => {
            this.errorMessage = e
          })
    }

    clearNewEvent() {
      this.dataSourceClear = true
      this.dialog = false
      this.errorMessage = ''
      this.$emit("dialogClose")
    }

  }
  </script>

  <style lang="scss">
  .v-expansion-panel-header__icon .v-icon__svg {
    color: white;
  }
  </style>
