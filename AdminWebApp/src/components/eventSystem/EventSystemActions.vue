<template>
  <DialogBasic
    ref="dialog"
    :icon-name="config.icon"
    :max-width="maxWidth" 
    :icon="icon" 
    :title="config.title"
    @closeDialog="resetDialog"
    @openDialog="openDialog"
  >
    <template #content>
      <error-banner :message="errorMessage" @closeAlert="errorMessage = ''"></error-banner>
      <success-banner :message="successMessage"></success-banner>
      <template v-if="mode === 'create' || mode === 'edit'">
        <v-form
          ref="form"
          v-model="validEvent"
          lazy-validation
        >
          <!-- Action Type -->
          <v-select
            v-model="newEventAction.action_type"
            :items="actionType()"
            @input="selectActionType"
            :label="$t('events.actionType')"
            :rules="[validateRequired]"
          >
          </v-select>

          <!-- Event Type -->
          <v-select
            v-model="newEventAction.event_type"
            :items="eventType()"
            @input="selectEventType"
            :label="$t('events.eventType')"
            :rules="[validateRequired]"
          >
          </v-select>

          <!-- Data Source Selection -->
          <SelectDataSource v-if="showDataSource"
            :containerID="containerID"
            :show-archived="true"
            :dataSourceID="newEventAction.data_source_id"
            :noIndent="true"
            :label="dataSourceLabel"
            @selected="setDataSourceID"
          >
          </SelectDataSource>

          <!-- Destination -->
          <template>
            <v-text-field v-if="newEventAction.action_type === 'email_user'"
                v-model="newEventAction.destination"
                :label="$t('events.destinationEmail')"
                :rules="[validateRequired]"
            ></v-text-field>
            <v-text-field v-else
                v-model="newEventAction.destination"
                :append-icon="send ? 'mdi-send' : 'mdi-send-check'"
                @click:append="sendEvent"
                :label="$t('edges.destination')"
                :rules="[validateRequired]"
            ></v-text-field>
          </template>

          <!-- Destination Data Source -->
          <v-text-field v-if="newEventAction.event_type === 'manual'"
            v-model="newEventAction.destination_data_source_id"
            :label="$t('events.destinationDataSource')"
          ></v-text-field>

          <!-- Enable/Activate -->
          <v-checkbox
                v-model="newEventAction.active"
                :label="$t('general.enable')"
          ></v-checkbox>
        </v-form>
      </template>

      <template v-if="mode === 'delete'">
        <v-row>
          <v-col :cols="12">
            <v-alert type="warning">
              {{$t('warnings.deleteEvent')}}
            </v-alert>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'send'">
        <v-row>
          <v-col :cols="12">
            <v-alert v-if="successMessage === ''"
              type="warning"
              elevation="2"
            >
              {{$t('events.confirmSend')}}
            </v-alert>
          </v-col>
        </v-row>
      </template>

      <template v-if="mode === 'status'">
        <v-data-table
        :headers="statusHeaders()"
        :items="eventActionStatuses"
        :loading="eventsLoading"
        class="elevation-1"
        >
          <template v-slot:[`item.event`]="{ item }">
            <span>{{JSON.stringify(item.event)}}</span>
          </template>
        </v-data-table>
      </template>
    </template>

    <template #actions>
      <template v-if="mode === 'create'">
        <v-btn
          color="primary"
          text
          @click="createEventAction()"
        >{{$t("general.create")}}</v-btn>
      </template>

      <template v-if="mode === 'edit'">
        <v-btn
          color="primary"
          text
          @click="updateEventAction()"
        >{{$t("general.save")}}</v-btn>
      </template>

      <template v-if="mode === 'delete'">
        <v-btn 
          color="primary" 
          text 
          @click="deleteEventAction()" 
        >{{$t("general.delete")}}</v-btn>
      </template>

      <template v-if="mode === 'send'">
        <v-btn v-if="successMessage === ''"
          color="primary" 
          text 
          @click="sendEvent()" 
        >{{$t("general.send")}}</v-btn>
      </template>
    </template>
  </DialogBasic>
</template>

<script lang="ts">
  import Vue, { PropType } from 'vue';
  import { EventActionT, DataSourceT, EventActionStatusT } from '@/api/types';
  import DialogBasic from '../dialogs/DialogBasic.vue';
  import SelectDataSource from "../dataSources/SelectDataSource.vue";
  import axios from "axios";
  import { AxiosResponse, AxiosRequestConfig } from "axios";

  interface EventSystemActionsModel {
    config: {
      icon?: string
      title?: string
    }
    errorMessage: string
    successMessage: string
    dialog: boolean
    validEvent: boolean
    select: string | null
    send: boolean
    loading: boolean
    selectedDataSource: DataSourceT | null
    selectedDestinationDataSource: DataSourceT | null
    selected: DataSourceT | DataSourceT[] | null
    newEventAction: EventActionT
    dataSourceLabel: string
    eventsLoading: boolean
    eventActionStatuses: EventActionStatusT[]
  }

  export default Vue.extend ({
    name: 'EventSystemActions',

    components: { DialogBasic, SelectDataSource },

    props: {
      mode: {type: String, required: true},
      icon: {type: Boolean, required: false, default: true},
      containerID: {type: String, required: true},
      maxWidth: {type: String, required: false, default: '80%'},
      eventAction: {type: Object as PropType<EventActionT>, required: false},
      actionID: {type: String, required: false},
    },

    data: (): EventSystemActionsModel => ({
      config: {},
      errorMessage: "",
      successMessage: "",
      dialog: false,
      validEvent: false,
      select: null,
      send: true,
      loading: true,
      selectedDataSource: null,
      selectedDestinationDataSource: null,
      selected: null,
      newEventAction: {
        container_id: "",
        data_source_id: undefined,
        event_type: undefined,
        action_type: undefined,
        destination_data_source_id: undefined,
        active: false,
      },
      dataSourceLabel: "",
      eventsLoading: false,
      eventActionStatuses: [],
    }),

    beforeMount() {
      switch(this.mode) {
        case 'create': {
          this.config.title = 'Create Event Action';
          break;
        }
        case 'edit': {
          this.config.title = 'Edit Event Action';
          this.config.icon = 'mdi-pencil';
          break;
        }
        case 'delete': {
          this.config.title = 'Delete Event Action';
          this.config.icon = 'mdi-delete';
          break;
        }
        // case 'send': {
        //   this.config.title = 'Send Event Action';
        //   this.config.icon = 'mdi-send';
        //   break;
        // }
        case 'status': {
          this.config.title = 'Event Action Status';
          this.config.icon = 'mdi-list-status';
          break;
        }
        default: {
          break;
        }
      }

      if (this.mode === 'edit') {
        this.newEventAction = Object.assign({}, this.eventAction);
      }
    },

    computed: {
      showDataSource () {
        const sourceTypes = [
          'data_source_created', 'data_source_modified', 'data_exported'
        ]

        return !sourceTypes.includes(this.newEventAction.event_type!);
      }
    },

    methods: {
      eventType(): {text: string; value: string}[] {
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
      },
      actionType(): {text: string; value: string}[] {
        // List of action types that the user can choose from
        const types =  [
            {text: this.$t('general.default'), value: 'default'},
            {text: this.$t('events.sendData'), value: 'send_data'},
            {text: this.$t('events.emailUser'), value: 'email_user'},
        ]
        return types
      },
      selectEventType(event: string) {
      this.newEventAction.event_type = event
      },
      selectActionType(action: string) {
      this.newEventAction.action_type = action
      },
      setDataSourceID(dataSource: any) {
        this.selectedDataSource = dataSource
      },
      validateRequired(value: string) {
        return !!value || this.$t('validation.required');
      },
      createEventAction() {
        // @ts-ignore
        if(!this.$refs.form!.validate()) return;

        this.newEventAction.container_id = this.containerID

        if(this.selectedDataSource) {this.newEventAction.data_source_id = this.selectedDataSource.id}

        this.$client.createEventAction(this.newEventAction)
            .then((event)=> {
              this.closeDialog()
              this.$emit("eventCreated", event)
            })
            .catch(e => {
              this.errorMessage = e
            })
      },
      updateEventAction() {
        this.newEventAction.container_id = this.containerID

        if(this.selectedDataSource) {this.newEventAction.data_source_id = this.selectedDataSource.id}

        this.$client.updateEventAction(this.newEventAction)
            .then((event)=> {
              this.$emit("eventUpdated", event)
              this.closeDialog()
            })
            .catch(e => this.errorMessage = e)
      },
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
            this.successMessage = 'Event Destination Reachable'
            this.errorMessage = ''
          }
        } catch(e: any) {
          this.errorMessage = e
        }
      },
      deleteEventAction() {
        this.$client.deleteEventAction(this.eventAction!.id!)
            .then(() => {
              this.closeDialog()
              this.$emit('eventDeleted')
            })
            .catch(e => this.errorMessage = e)
      },
      statusHeaders() {
        return [
            { text: this.$t('general.id'), value: 'id'},
            { text: this.$t('events.actionID'), value: 'event_action_id' },
            { text: this.$t('general.status'), value: 'status'},
            { text: this.$t('general.statusMessage'), value: 'status_message'},
            { text: this.$t('general.dateCreated'), value: 'created_at'},
            { text: this.$t('events.event'), value: 'event'},
          ]
      },
      refreshEventActionStatus() {
        this.eventsLoading = true
        this.$client.listEventActionStatusForEventAction(this.actionID)
            .then((eventActionStatuses: EventActionStatusT[]) => {
              this.eventActionStatuses = eventActionStatuses
            })
            .catch(e => this.errorMessage = e)
            .finally(() => this.eventsLoading = false)
      },
      // trigger any necessary resets upon open/close
      closeDialog() {
        const dialogInstance = this.$refs.dialog as InstanceType<typeof DialogBasic> | undefined;
        if (dialogInstance) {
          dialogInstance.close();
        }
      },
      openDialog() {
        this.$nextTick(() => {
          this.resetDialog();
        })
      },
      resetDialog() {
        this.errorMessage = "";
        this.successMessage = "";
        
        if (this.mode === 'create') {
          this.newEventAction = {
            container_id: "",
            data_source_id: undefined,
            event_type: undefined,
            action_type: undefined,
            destination_data_source_id: undefined,
            active: false,
          };
        }

        if (this.mode === 'edit') {
          this.newEventAction = Object.assign({}, this.eventAction);
        }

        if (this.mode === 'status') {
          this.refreshEventActionStatus();
        }
      },
    }
  })
</script>